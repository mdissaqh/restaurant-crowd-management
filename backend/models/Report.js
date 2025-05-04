const mongoose = require('mongoose');
const schema = new mongoose.Schema({
  generatedAt: { type: Date, default: Date.now },
  from: Date,
  to: Date,
  orders: Array
});
module.exports = mongoose.model('Report', schema);
