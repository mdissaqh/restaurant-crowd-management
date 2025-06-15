// backend/server.js
require('dotenv').config();
const express  = require('express');
const http     = require('http');
const mongoose = require('mongoose');
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

// Multer setup for menu images
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename:    (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage });

// Twilio setup
const twClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

// Helper to normalize numbers and send SMS
async function sendSMS(rawTo, body, context = 'SMS') {
  console.log(`[${context}] sendSMS rawTo="${rawTo}" body="${body}"`);
  if (!rawTo || !body) {
    console.warn(`[${context}] Missing number or body; skipping SMS.`);
    return;
  }
  const cc = process.env.DEFAULT_COUNTRY_CODE || '+91';
  const to = rawTo.startsWith('+') ? rawTo : cc + rawTo;
  console.log(`[${context}] → Sending SMS to=${to}`);
  try {
    const msg = await twClient.messages.create({
      body,
      from: process.env.TWILIO_PHONE_NUMBER,
      to
    });
    console.log(`[${context}] ✓ queued SID=${msg.sid}`);
  } catch (err) {
    console.error(`[${context}] ✗ Twilio error:`, err);
  }
}

// Test endpoint for quick verification
app.get('/api/test-sms', async (req, res) => {
  const { to, body } = req.query;
  if (!to || !body) return res.status(400).json({ error: 'Use ?to=&body=' });
  await sendSMS(to, body, 'Test‑SMS');
  res.json({ success: true });
});

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/restaurant', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('[MongoDB] Connected'))
.catch(err => console.error('[MongoDB] Error:', err));

// Load or initialize settings
let appSettings = {};
(async function loadSettings() {
  appSettings = await Settings.findOne() || await Settings.create({});
  console.log('[Settings] Loaded:', appSettings);
})().catch(err => console.error('[Settings] Error:', err));


// ===== MENU ROUTES =====
app.get('/api/menu', async (_, res) => {
  res.json(await MenuItem.find());
});

app.post('/api/menu', upload.single('image'), async (req, res) => {
  try {
    const { name, price, category, isAvailable } = req.body;
    const image = req.file ? `/uploads/${req.file.filename}` : '';
    const item = await new MenuItem({
      name,
      price: +price,
      image,
      category,
      isAvailable: isAvailable === 'true'
    }).save();
    io.emit('menuUpdated');
    res.status(201).json(item);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.put('/api/menu/:id', async (req, res) => {
  try {
    const updates = {};
    if (req.body.price        != null) updates.price       = +req.body.price;
    if (req.body.isAvailable  != null) updates.isAvailable = req.body.isAvailable === 'true';
    const updated = await MenuItem.findByIdAndUpdate(req.params.id, updates, { new: true });
    if (!updated) return res.status(404).json({ error: 'Menu item not found' });
    io.emit('menuUpdated');
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/menu/:id', async (req, res) => {
  try {
    await MenuItem.findByIdAndDelete(req.params.id);
    io.emit('menuUpdated');
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// ===== ORDER CREATION =====
app.post('/api/order', async (req, res) => {
  console.log('[Order] Create request:', req.body);
  try {
    const { name, mobile, email, serviceType, address, items, lat, lng, formattedAddress } = req.body;

    // Validate delivery address
    if (serviceType === 'Delivery') {
      for (const field of ['flat','area','landmark','city','pincode']) {
        if (!address[field]?.toString().trim()) {
          return res.status(400).json({ error: `Missing address field: ${field}` });
        }
      }
    }

    // Check global/service toggles
    if (
      appSettings.cafeClosed ||
      (serviceType==='Dine-in'  && !appSettings.dineInEnabled) ||
      (serviceType==='Takeaway' && !appSettings.takeawayEnabled) ||
      (serviceType==='Delivery' && !appSettings.deliveryEnabled)
    ) {
      return res.status(403).json({ error: appSettings.note });
    }

    // Build detailed items list
    const detailed = await Promise.all(items.map(async ({ id, qty }) => {
      const m = await MenuItem.findById(id);
      if (!m || !m.isAvailable) throw new Error(`Item ${m?.name||'Unknown'} not available`);
      return { id, name: m.name, price: m.price, qty };
    }));

    // Calculate totals
    const baseTotal = detailed.reduce((sum, i) => sum + i.price*i.qty, 0);
    const cgst      = +(baseTotal * appSettings.cgstPercent/100).toFixed(2);
    const sgst      = +(baseTotal * appSettings.sgstPercent/100).toFixed(2);
    const fee       = serviceType==='Delivery' ? appSettings.deliveryCharge : 0;
    const total     = baseTotal + cgst + sgst + fee;

    // Save the order
    const order = await new Order({
      name, mobile, email, serviceType,
      address: serviceType==='Delivery' ? JSON.stringify(address) : '',
      items: detailed, total, cgstAmount: cgst, sgstAmount: sgst, deliveryCharge: fee,
      lat, lng, formattedAddress
    }).save();

    io.emit('newOrder', order);
    console.log('[Order] Created ID=', order._id);

    // Always send creation SMS:
    await sendSMS(
      mobile,
      `Hello ${name}, your order ${order._id} has been placed, Thank you for ordering with Millennials cafe. Total ₹${total}. By Millennials cafe`,
      'Order‑Creation'
    );

    res.status(201).json(order);
  } catch (err) {
    console.error('[Order] Create error:', err);
    res.status(400).json({ error: err.message });
  }
});

app.get('/api/myorders', async (req, res) => {
  if (!req.query.mobile) return res.status(400).json({ error: 'Missing mobile' });
  res.json(await Order.find({ mobile: req.query.mobile }).sort({ createdAt: -1 }));
});

app.get('/api/orders', async (_, res) => {
  res.json(await Order.find().sort({ createdAt: -1 }));
});


// ===== ORDER UPDATE & SMS =====
app.post('/api/order/update', async (req, res) => {
  console.log('[Order] Update request:', req.body);
  try {
    const { id, status, estimatedTime, cancellationNote } = req.body;
    const o = await Order.findById(id);
    if (!o) return res.status(404).json({ error: 'Order not found' });

    const oldETA = o.estimatedTime;
    const oldStatus = o.status;

    if (estimatedTime != null) o.estimatedTime = +estimatedTime;
    if (status) {
      o.status = status;
      if (status==='Cancelled') {
        o.cancellationNote = cancellationNote || '';
        o.completedAt      = new Date();
      }
      if (['Completed','Delivered'].includes(status)) {
        o.completedAt = new Date();
      }
    }

    await o.save();
    io.emit('orderUpdated', o);
    console.log('[Order] Saved ID=', o._id, 'status=', o.status, 'ETA=', o.estimatedTime);

    // 1) If ETA changed at all, send Processing SMS:
    if (estimatedTime != null && o.estimatedTime !== oldETA) {
      await sendSMS(
        o.mobile,
        `Hello ${o.name}, your order ${o._id} is now Processing. ETA: ${o.estimatedTime} mins. By Millennials cafe`,
        'Order‑Processing'
      );
    }

    // 2) If status changed to a terminal state, send that SMS:
    if (status && status !== oldStatus) {
      let msg = '';
      switch (o.status) {
        case 'Ready':
          msg = `Hello ${o.name}, your order ${o._id} is Ready. Please collect it from the counter. By Millennials cafe`;
          break;
        case 'Ready for Pickup':
          msg = `Hello ${o.name}, your order ${o._id} is Ready for Pickup. By Millennials cafe`;
          break;
        case 'Completed':
          msg = `Hello ${o.name}, your order ${o._id} is Completed. Please provide your feedback in My orders page. By Millennials cafe`;
          break;
        case 'Delivered':
          msg = `Hello ${o.name}, your order ${o._id} is Delivered. Enjoy, and please leave feedback! in My orders page. By Millennials cafe`;
          break;
        case 'Cancelled':
          msg = `Hello ${o.name}, your order ${o._id} has been Cancelled check cancellation reason in My orders page. By Millennials cafe`;
          break;
      }
      if (msg) {
        await sendSMS(o.mobile, msg, 'Order‑Status');
      }
    }

    res.json(o);
  } catch (err) {
    console.error('[Order] Update error:', err);
    res.status(400).json({ error: err.message });
  }
});


// ===== FEEDBACK =====
app.post('/api/order/feedback', async (req, res) => {
  try {
    const { id, rating, feedback } = req.body;
    if (!id || rating == null) return res.status(400).json({ error: 'Missing id or rating' });
    const o = await Order.findById(id);
    if (!o) return res.status(404).json({ error: 'Order not found' });
    if (!['Completed','Delivered'].includes(o.status)) {
      return res.status(403).json({ error: 'Cannot rate an incomplete order' });
    }
    o.rating   = +rating;
    o.feedback = feedback?.trim() || '';
    await o.save();
    io.emit('orderUpdated', o);
    res.json(o);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});


// ===== SETTINGS =====
app.get('/api/settings', async (_, res) => {
  res.json(await Settings.findOne());
});
app.post('/api/settings', async (req, res) => {
  appSettings = await Settings.findOneAndUpdate({}, req.body, { new: true });
  io.emit('settingsUpdated', appSettings);
  res.json(appSettings);
});


// ===== SOCKET.IO =====
io.on('connection', socket => {
  console.log('[Socket.IO] Client connected:', socket.id);
  socket.on('menuUpdated',     () => io.emit('menuUpdated'));
  socket.on('settingsUpdated', () => io.emit('settingsUpdated'));
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => console.log(`[Startup] Listening on port ${PORT}`));
