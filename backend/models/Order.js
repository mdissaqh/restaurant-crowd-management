const mongoose = require('mongoose');
const schema = new mongoose.Schema({
  name: String,
  mobile: String,
  email: String,
  serviceType: String,
  address: String,
  items: [{ id:String, name:String, price:Number, qty:Number }],
  total: Number,
  note: String,
  estimatedTime: Number,
  status: { type: String, default: 'Pending' },
  createdAt: { type: Date, default: Date.now },
  completedAt: Date
});
module.exports = mongoose.model('Order', schema);
