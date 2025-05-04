const express  = require('express');
const router   = express.Router();
const Order    = require('../models/Order');
const MenuItem = require('../models/MenuItem');
const Settings = require('../models/Settings');

// GET /api/orders        -> list all orders
// GET /api/orders/my    -> list current user orders by ?mobile=
router.get('/', async (req, res) => {
  try {
    const all = await Order.find().sort({ createdAt: -1 });
    return res.json(all);
  } catch (err) {
    console.error('GET /api/orders error:', err);
    return res.status(500).json({ error: 'Could not fetch orders' });
  }
});

router.get('/my', async (req, res) => {
  const { mobile } = req.query;
  if (!mobile) return res.status(400).json({ error: 'Missing mobile' });
  try {
    const list = await Order.find({ mobile }).sort({ createdAt: -1 });
    return res.json(list);
  } catch (err) {
    console.error('GET /api/orders/my error:', err);
    return res.status(500).json({ error: 'Could not fetch your orders' });
  }
});

// POST /api/orders       -> create new order
router.post('/', async (req, res) => {
  console.log('📥 /api/orders POST body:', req.body);
  try {
    const { name, mobile, email, serviceType, address, items, note } = req.body;
    if (!mobile || !/^\d{10}$/.test(mobile)) return res.status(400).json({ error: 'Mobile must be 10 digits' });
    if (!Array.isArray(items) || !items.length) return res.status(400).json({ error: 'No items provided' });

    const settings = await Settings.findOne();
    const mapKey   = { 'Dine-in':'dineIn','Takeaway':'takeaway','Delivery':'delivery' }[serviceType];
    if (!mapKey || !settings.serviceAvailability[mapKey]) {
      const msg = serviceType==='Dine-in'
        ? 'Dine-in is not available: restaurant filled'
        : 'Service temporarily unavailable';
      return res.status(400).json({ error: msg });
    }

    const detailed = await Promise.all(
      items.map(async ({ id, qty }) => {
        const m = await MenuItem.findById(id);
        if (!m) throw new Error(`MenuItem ${id} not found`);
        return { id, name: m.name, price: m.price, qty };
      })
    );
    const total = detailed.reduce((s,i)=>s + i.price*i.qty, 0);

    const order = new Order({ name, mobile, email, serviceType, address, items: detailed, total, note: note||'' });
    await order.save();
    const io = req.app.get('io'); if (io) io.emit('newOrder', order);
    return res.status(201).json(order);
  } catch (err) {
    console.error('POST /api/orders error:', err);
    const code = err.message.includes('not found') ? 400 : 500;
    return res.status(code).json({ error: err.message });
  }
});

// POST /api/orders/update -> update existing order
router.post('/update', async (req, res) => {
  console.log('📥 /api/orders/update body:', req.body);
  try {
    const { id, status, estimatedTime, note } = req.body;
    const o = await Order.findById(id);
    if (!o) return res.status(404).json({ error: 'Order not found' });
    if (estimatedTime!=null) o.estimatedTime = +estimatedTime;
    if (status) {
      o.status = status;
      if (['Completed','Delivered','Cancelled'].includes(status)) o.completedAt = new Date();
    }
    if (status==='Cancelled' && note) o.note = note;
    await o.save();
    const io = req.app.get('io'); if (io) io.emit('orderUpdated', o);
    return res.json(o);
  } catch (err) {
    console.error('POST /api/orders/update error:', err);
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;