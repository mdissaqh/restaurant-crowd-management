const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema({
  dineInEnabled:     { type: Boolean, default: true },
  takeawayEnabled:   { type: Boolean, default: true },
  deliveryEnabled:   { type: Boolean, default: true },
  cafeClosed:        { type: Boolean, default: false },
  showNotes:         { type: Boolean, default: false },
  note:              { type: String,  default: '' },
  // ← NEW tax & fee settings
  cgstPercent:       { type: Number, min: 0, default: 0 },
  sgstPercent:       { type: Number, min: 0, default: 0 },
  deliveryCharge:    { type: Number, min: 0, default: 0 }
}, {
  timestamps: true
});

module.exports = mongoose.model('Settings', settingsSchema);
