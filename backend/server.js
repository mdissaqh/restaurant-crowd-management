// backend/server.js

require('dotenv').config();
const mongoose = require('mongoose');
const express  = require('express');
const http     = require('http');
const cors     = require('cors');
const multer   = require('multer');
const path     = require('path');
const { Server } = require('socket.io');

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
  const { name, price, category } = req.body;
  const image = req.file?`/uploads/${req.file.filename}`:'';
  const doc = await new MenuItem({ name, price:+price, image, category }).save();
  res.status(201).json(doc);
});

app.delete('/api/menu/:id', async (req,res) => {
  try {
    await MenuItem.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// --- ORDER ---
app.post('/api/order', async (req,res) => {
  const { name,mobile,email,serviceType,address,items,lat,lng,formattedAddress } = req.body;

  // enforce settings
  if (appSettings.cafeClosed)     return res.status(403).json({ error: appSettings.note });
  if (!appSettings.dineInEnabled && serviceType==='Dine-in')   return res.status(403).json({ error: appSettings.note });
  if (!appSettings.takeawayEnabled && serviceType==='Takeaway') return res.status(403).json({ error: appSettings.note });
  if (!appSettings.deliveryEnabled && serviceType==='Delivery') return res.status(403).json({ error: appSettings.note });

  const detailed = await Promise.all(items.map(async ({id,qty})=>{
    const m = await MenuItem.findById(id);
    return { id, name:m.name, price:m.price, qty };
  }));
  const total = detailed.reduce((s,i)=>s + i.price*i.qty, 0);

  const order = await new Order({ name,mobile,email,serviceType,address,items:detailed,total,lat,lng,formattedAddress }).save();
  io.emit('newOrder', order);
  res.status(201).json(order);
});

app.get('/api/myorders', async (req,res) => {
  const { mobile } = req.query;
  if (!mobile) return res.status(400).json({ error: 'Missing mobile' });
  res.json(await Order.find({ mobile }).sort({ createdAt: -1 }));
});

app.get('/api/orders', async (_,res) => {
  res.json(await Order.find().sort({ createdAt: -1 }));
});

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

io.on('connection', sock => {
  console.log('Socket connected:', sock.id);
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
