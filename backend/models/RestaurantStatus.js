const mongoose = require('mongoose');
const schema = new mongoose.Schema({
  isOpen: { type: Boolean, default: true }
});
module.exports = mongoose.model('RestaurantStatus', schema);
