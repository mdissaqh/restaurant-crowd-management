const mongoose = require('mongoose');
const schema = new mongoose.Schema({ name: { type: String, unique: true, required: true, trim: true } });
module.exports = mongoose.model('Category', schema);
