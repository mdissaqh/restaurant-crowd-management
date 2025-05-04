const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  name:       String,
  mobile:     String,
  email:      String,
  serviceType:String,
  address:    String,
  items:      [{ id:String, name:String, price:Number, qty:Number }],
  total:      Number,
  note:       { type: String, default: '' },
  estimatedTime: Number,
  status:     { type: String, default: 'Pending' },
  createdAt:  { type: Date, default: Date.now },
  completedAt:{ type: Date }
});

module.exports = mongoose.model('Order', orderSchema);