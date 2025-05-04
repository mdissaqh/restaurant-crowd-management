// backend/models/RestaurantSettings.js
const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema({
  restaurantName: { type: String, default: 'My Restaurant' },
  logoUrl: { type: String, default: '/uploads/default-logo.png' },
  allowDineIn: { type: Boolean, default: true },
  allowDelivery: { type: Boolean, default: true },
  serviceNote: String,
  cgst: { type: Number, default: 2.5 },
  sgst: { type: Number, default: 2.5 },
  deliveryFee: { type: Number, default: 30 },
  packagingCharge: { type: Number, default: 10 },
  coupons: [{
    code: String,
    discount: Number,
    validUntil: Date,
    minOrder: Number
  }],
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('RestaurantSettings', settingsSchema);