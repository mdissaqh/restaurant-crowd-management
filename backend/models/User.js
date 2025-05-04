const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name:    { type: String, required: true },
  mobile:  { type: String, required: true, unique: true },
  created: { type: Date,   default: Date.now }
});

module.exports = mongoose.model('User', userSchema);
