const Order = require('../models/Order');

// Get all orders
exports.getAllOrders = async (req, res) => {
  try {
    const orders = await Order.find().populate('items.item');
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
};

// Create a new order
exports.createOrder = async (req, res) => {
  try {
    const { items, serviceType, customerName, phoneNumber } = req.body;
    const newOrder = await Order.create({
      items,
      serviceType,
      customerName,
      phoneNumber,
      status: 'Pending'
    });
    res.status(201).json(newOrder);
  } catch (err) {
    res.status(400).json({ error: 'Failed to create order' });
  }
};

// Update order status
exports.updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const updatedOrder = await Order.findByIdAndUpdate(id, { status }, { new: true });
    res.json(updatedOrder);
  } catch (err) {
    res.status(400).json({ error: 'Failed to update order status' });
  }
};
