const mongoose = require('mongoose');
const schema = new mongoose.Schema({
  service: { type:String, enum:['dineIn','takeaway','delivery'], unique:true },
  message: { type:String }
});
module.exports = mongoose.model('ServiceNotice', schema);
