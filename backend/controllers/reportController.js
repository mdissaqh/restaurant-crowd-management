const Order = require('../models/Order');

exports.range = async (req, res) => {
  const { from, to } = req.query;
  const list = await Order.find({
    createdAt: { $gte: new Date(from), $lte: new Date(to) }
  }).sort({ createdAt: -1 });
  res.json(list);
};
