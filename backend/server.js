// backend/server.js

require('dotenv').config();
const mongoose = require('mongoose');
const express = require('express');
const http = require('http');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const { Server } = require('socket.io');

const MenuItem = require('./models/MenuItem');
const Order    = require('./models/Order');
const Settings = require('./models/Settings');

const app    = express();
const server = http.createServer(app);
const io     = new Server(server, {
  cors: { origin: '*' }
});

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename:    (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage });

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/restaurant', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

// Initialize single Settings doc
let appSettings;
Settings.findOne().then(doc => {
  if (!doc) return Settings.create({});
  return doc;
}).then(doc => appSettings = doc);

// ===== MENU =====
app.get('/api/menu', async (req, res) => {
  const items = await MenuItem.find();
  res.json(items);
});

app.post('/api/menu', upload.single('image'), async (req, res) => {
  const { name, price, category } = req.body;
  const image = req.file ? `/uploads/${req.file.filename}` : '';
  const item = new MenuItem({ name, price: +price, image, category });
  const doc  = await item.save();
  res.status(201).json(doc);
});

app.delete('/api/menu/:id', async (req, res) => {
  try {
    await MenuItem.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ===== ORDER =====
app.post('/api/order', async (req, res) => {
  const { name, mobile, email, serviceType, address, items, lat, lng, formattedAddress } = req.body;

  // enforce settings
  if (appSettings.cafeClosed) {
    return res.status(403).json({ error: `Cafe closed: ${appSettings.note}` });
  }
  if (serviceType === 'Dine-in'  && !appSettings.dineInEnabled)  {
    return res.status(403).json({ error: `Dine-in disabled: ${appSettings.note}` });
  }
  if (serviceType === 'Takeaway' && !appSettings.takeawayEnabled) {
    return res.status(403).json({ error: `Takeaway disabled: ${appSettings.note}` });
  }
  if (serviceType === 'Delivery' && !appSettings.deliveryEnabled) {
    return res.status(403).json({ error: `Delivery disabled: ${appSettings.note}` });
  }

  const detailed = await Promise.all(
    items.map(async ({ id, qty }) => {
      const m = await MenuItem.findById(id);
      return { id, name: m.name, price: m.price, qty };
    })
  );
  const total = detailed.reduce((sum, i) => sum + i.price * i.qty, 0);

  const order = new Order({
    name,
    mobile,
    email,
    serviceType,
    address,
    items: detailed,
    total,
    lat,
    lng,
    formattedAddress,
  });
  await order.save();
  io.emit('newOrder', order);
  res.status(201).json(order);
});

app.get('/api/myorders', async (req, res) => {
  const { mobile } = req.query;
  if (!mobile) return res.status(400).json({ error: 'Missing mobile' });
  const orders = await Order.find({ mobile }).sort({ createdAt: -1 });
  res.json(orders);
});

app.get('/api/orders', async (req, res) => {
  const orders = await Order.find().sort({ createdAt: -1 });
  res.json(orders);
});

app.post('/api/order/update', async (req, res) => {
  const { id, status, estimatedTime, cancellationNote } = req.body;
  const o = await Order.findById(id);
  if (!o) return res.status(404).json({ error: 'Order not found' });

  if (estimatedTime != null) {
    o.estimatedTime = +estimatedTime;
  }

  if (status) {
    o.status = status;
    if (status === 'Cancelled') {
      o.cancellationNote = cancellationNote || '';
      o.completedAt = new Date();
    }
    if (['Completed', 'Delivered'].includes(status)) {
      o.completedAt = new Date();
    }
  }

  await o.save();
  io.emit('orderUpdated', o);
  res.json(o);
});

// ===== SETTINGS =====
app.get('/api/settings', async (req, res) => {
  const settings = await Settings.findOne();
  res.json(settings);
});

app.post('/api/settings', async (req, res) => {
  const updates = req.body;
  const settings = await Settings.findOneAndUpdate({}, updates, { new: true });
  appSettings = settings;
  io.emit('settingsUpdated', settings);
  res.json(settings);
});

// Socket
io.on('connection', sock => {
  console.log('Socket connected:', sock.id);
});

// Start
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => console.log(`Server running on ${PORT}`));
