require('dotenv').config();
const mongoose = require('mongoose');
const express  = require('express');
const http     = require('http');
const cors     = require('cors');
const multer   = require('multer');
const { Server } = require('socket.io');
const path     = require('path');

const MenuItem = require('./models/MenuItem');
const Order    = require('./models/Order');

const app    = express();
const server = http.createServer(app);
const io     = new Server(server, { cors: { origin: '*' } });

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

// -- Menu routes --

app.get('/api/menu', async (req, res) => {
  const items = await MenuItem.find();
  res.json(items);
});

app.post('/api/menu', upload.single('image'), (req, res) => {
  const { name, price, category } = req.body;
  // fixed: wrap in backticks so ${…} is valid
  const image = req.file ? `/uploads/${req.file.filename}` : '';
  const item  = new MenuItem({ name, price: +price, image, category });
  item.save().then(doc => res.status(201).json(doc));
});

app.delete('/api/menu/:id', (req, res) => {
  MenuItem.findByIdAndDelete(req.params.id)
    .then(() => res.json({ success: true }))
    .catch(err => res.status(500).json({ error: err.message }));
});

// -- Order routes --

app.post('/api/order', async (req, res) => {
  const { name, mobile, email, serviceType, address, items, lat, lng, formattedAddress } = req.body;
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
    formattedAddress
  });
  await order.save();
  io.emit('newOrder', order);
  res.status(201).json(order);
});

app.get('/api/myorders', async (req, res) => {
  const { mobile } = req.query;
  if (!mobile) return res.status(400).json({ error: 'Missing mobile' });
  const list = await Order.find({ mobile }).sort({ createdAt: -1 });
  res.json(list);
});

app.get('/api/orders', async (req, res) => {
  const all = await Order.find().sort({ createdAt: -1 });
  res.json(all);
});

// UPDATED: mark terminal statuses with completedAt
app.post('/api/order/update', async (req, res) => {
  const { id, status, estimatedTime } = req.body;
  const o = await Order.findById(id);
  if (!o) return res.status(404).json({ error: 'Order not found' });

  // update estimatedTime if provided
  if (estimatedTime != null) {
    o.estimatedTime = +estimatedTime;
  }

  if (status) {
    o.status = status;

    // whenever status is one of these terminal states, set completedAt
    if (['Completed', 'Delivered', 'Cancelled'].includes(status)) {
      o.completedAt = new Date();
    }
  }

  await o.save();
  io.emit('orderUpdated', o);
  res.json(o);
});

// Socket connection log
io.on('connection', sock => console.log('Socket connected:', sock.id));

const PORT = process.env.PORT || 3001;
// fixed: wrap in backticks so ${…} is valid
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
