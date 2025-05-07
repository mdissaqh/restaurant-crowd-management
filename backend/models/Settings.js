// backend/models/Settings.js
const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema({
  dineInEnabled: { type: Boolean, default: true },
  takeawayEnabled: { type: Boolean, default: true },
  deliveryEnabled: { type: Boolean, default: true },
  cafeClosed:     { type: Boolean, default: false },
  note:           { type: String, default: '' },
}, {
  timestamps: true
});

module.exports = mongoose.model('Settings', settingsSchema);
