const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema({
  restaurantName: { type: String, default: 'My Restaurant' },
  logoUrl:        { type: String, default: '' },
  coupons:        [{ code: String, discount: Number }],
  tax: {
    cgst: { type: Number, default: 0 },
    sgst: { type: Number, default: 0 }
  },
  deliveryFee:     { type: Number, default: 0 },
  packagingCharge: { type: Number, default: 0 },
  serviceAvailability: {
    dineIn:    { type: Boolean, default: true },
    takeaway:  { type: Boolean, default: true },
    delivery:  { type: Boolean, default: true }
  }
});

module.exports = mongoose.model('Settings', settingsSchema);
