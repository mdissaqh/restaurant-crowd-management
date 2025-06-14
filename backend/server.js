// backend/server.js
require('dotenv').config();
const mongoose = require('mongoose');
const express  = require('express');
const http     = require('http');
const cors     = require('cors');
const multer   = require('multer');
const path     = require('path');
const { Server } = require('socket.io');
const twilio   = require('twilio');

const MenuItem = require('./models/MenuItem');
const Order    = require('./models/Order');
const Settings = require('./models/Settings');

const app    = express();
const server = http.createServer(app);
const io     = new Server(server, { cors: { origin: '*' } });

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const storage = multer.diskStorage({
  destination: (req,file,cb)=>cb(null,'uploads/'),
  filename:    (req,file,cb)=>cb(null,Date.now()+path.extname(file.originalname))
});
const upload = multer({ storage });

// --- Twilio setup ---
const twClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);
function sendSMS(to, body) {
  return twClient.messages.create({
    body,
    from: process.env.TWILIO_PHONE_NUMBER,
    to
  }).catch(err => console.error('Twilio Error:', err));
}

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/restaurant', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

// Initialize singleton settings
let appSettings;
Settings.findOne().then(doc => doc || Settings.create({}))
  .then(doc => appSettings = doc);

// --- MENU ---
app.get('/api/menu', async (_,res) => {
  res.json(await MenuItem.find());
});

app.post('/api/menu', upload.single('image'), async (req,res) => {
  const { name, price, category, isAvailable } = req.body;
  const image = req.file?`/uploads/${req.file.filename}`:'';
  const doc = await new MenuItem({
    name,
    price:+price,
    image,
    category,
    isAvailable: isAvailable === 'true' || isAvailable === true
  }).save();
  io.emit('menuUpdated');
  res.status(201).json(doc);
});

// Price and availability update endpoint
app.put('/api/menu/:id', async (req,res) => {
  try {
    const { price, isAvailable } = req.body;
    const updateData = {};
    if (price !== undefined)    updateData.price = +price;
    if (isAvailable !== undefined) updateData.isAvailable = isAvailable;
    const updatedItem = await MenuItem.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    );
    if (!updatedItem) return res.status(404).json({ error: 'Menu item not found' });
    io.emit('menuUpdated');
    res.json(updatedItem);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.delete('/api/menu/:id', async (req,res) => {
  try {
    await MenuItem.findByIdAndDelete(req.params.id);
    io.emit('menuUpdated');
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// --- ORDER CREATION ---
app.post('/api/order', async (req,res) => {
  const { name,mobile,email,serviceType,address,items,lat,lng,formattedAddress } = req.body;

  // enforce structured address if Delivery
  if (serviceType === 'Delivery') {
    const fields = ['flat','area','landmark','city','pincode'];
    for (let f of fields) {
      if (!address[f] || address[f].toString().trim() === '') {
        return res.status(400).json({ error: `Missing delivery address field: ${f}` });
      }
    }
  }

  if (appSettings.cafeClosed)                        return res.status(403).json({ error: appSettings.note });
  if (!appSettings.dineInEnabled && serviceType==='Dine-in')   return res.status(403).json({ error: appSettings.note });
  if (!appSettings.takeawayEnabled && serviceType==='Takeaway') return res.status(403).json({ error: appSettings.note });
  if (!appSettings.deliveryEnabled && serviceType==='Delivery') return res.status(403).json({ error: appSettings.note });

  const detailed = await Promise.all(items.map(async ({id,qty})=>{
    const m = await MenuItem.findById(id);
    if (!m || !m.isAvailable) throw new Error(`Item ${m?.name || 'Unknown'} is not available`);
    return { id, name:m.name, price:m.price, qty };
  }));

  const baseTotal = detailed.reduce((s,i)=>s + i.price*i.qty, 0);
  const s = await Settings.findOne();
  const cgstAmt     = +(baseTotal * s.cgstPercent/100).toFixed(2);
  const sgstAmt     = +(baseTotal * s.sgstPercent/100).toFixed(2);
  const deliveryFee = serviceType==='Delivery' ? s.deliveryCharge : 0;
  const grandTotal  = baseTotal + cgstAmt + sgstAmt + deliveryFee;

  const order = await new Order({
    name,
    mobile,
    email,
    serviceType,
    address: serviceType==='Delivery' ? JSON.stringify(address) : '',
    items: detailed,
    total: grandTotal,
    cgstAmount: cgstAmt,
    sgstAmount: sgstAmt,
    deliveryCharge: deliveryFee,
    lat,
    lng,
    formattedAddress
  }).save();

  io.emit('newOrder', order);

  // 1) Order placed SMS
  sendSMS(order.mobile,
    `Hello ${name},Thank you for ordering from Millennials Cafe your Order ID is ${order._id}. Your Total Amount is ₹${order.total}. Status: ${order.status}. By Millennials cafe.`);

  res.status(201).json(order);
});

// --- FETCH ORDERS ---
app.get('/api/myorders', async (req,res) => {
  const { mobile } = req.query;
  if (!mobile) return res.status(400).json({ error: 'Missing mobile' });
  res.json(await Order.find({ mobile }).sort({ createdAt: -1 }));
});

app.get('/api/orders', async (_,res) => {
  res.json(await Order.find().sort({ createdAt: -1 }));
});

// --- ORDER UPDATE + SMS ---
app.post('/api/order/update', async (req,res) => {
  const { id, status, estimatedTime, cancellationNote } = req.body;
  const o = await Order.findById(id);
  if (!o) return res.status(404).json({ error: 'Order not found' });

  if (estimatedTime != null) o.estimatedTime = +estimatedTime;
  if (status) {
    o.status = status;
    if (status === 'Cancelled') {
      o.cancellationNote = cancellationNote || '';
      o.completedAt = new Date();
    }
    if (['Completed','Delivered'].includes(status)) {
      o.completedAt = new Date();
    }
  }
  await o.save();
  io.emit('orderUpdated', o);

  // 2–8) Status‑based SMS
  let msg;
  const name = o.name;
  const oid  = o._id;
  switch(o.status) {
    case 'Processing':
      msg = `Hello ${name}, your order ${oid} is in ${o.status}. Estimated time is ${o.estimatedTime} mins, Thank you for yor patience. By Millennials cafe.`;
      break;
    case 'Ready':
      msg = `Hello ${name}, your order ${oid} is ${o.status}. Please collect it from the counter. By Millennials cafe.`;
      break;
    case 'Ready for Pickup':
      msg = `Hello ${name}, your order ${oid} is ${o.status}. By Millennials cafe.`;
      break;
    case 'Completed':
      msg = `Hello ${name}, your order ${oid} is ${o.status}. Please provide your feedback in My Orders page, Order again-see you soon. By Millennials cafe.`;
      break;
    case 'Delivered':
      msg = `Hello ${name}, your order ${oid} is ${o.status}. Please provide your feedback in My Orders page, Order again-see you soon. By Millennials cafe.`;
      break;
    case 'Cancelled':
      msg = `Hello ${name}, your order ${oid} is ${o.status}. Please check cancellation reason in My Orders page. By Millennials cafe.`;
      break;
  }
  if (msg) sendSMS(o.mobile, msg);

  res.json(o);
});

// --- FEEDBACK ---
app.post('/api/order/feedback', async (req, res) => {
  const { id, rating, feedback } = req.body;
  if (!id || rating == null) return res.status(400).json({ error: 'Missing id or rating' });
  const o = await Order.findById(id);
  if (!o) return res.status(404).json({ error: 'Order not found' });
  if (!['Completed','Delivered'].includes(o.status)) {
    return res.status(403).json({ error: 'Cannot rate an incomplete order' });
  }
  o.rating = +rating;
  o.feedback = feedback?.trim() || '';
  await o.save();
  io.emit('orderUpdated', o);
  res.json(o);
});

// --- SETTINGS ---
app.get('/api/settings', async (_,res) => {
  res.json(await Settings.findOne());
});

app.post('/api/settings', async (req,res) => {
  appSettings = await Settings.findOneAndUpdate({}, req.body, { new: true });
  io.emit('settingsUpdated', appSettings);
  res.json(appSettings);
});

// Socket connection handling
io.on('connection', sock => {
  console.log('Socket connected:', sock.id);
  sock.on('menuUpdated',     () => io.emit('menuUpdated'));
  sock.on('settingsUpdated', () => io.emit('settingsUpdated'));
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
