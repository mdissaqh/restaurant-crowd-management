const mongoose = require('mongoose');
const schema = new mongoose.Schema({
  name: String, price: Number, category: String, image: String
});
module.exports = mongoose.model('MenuItem', schema);
