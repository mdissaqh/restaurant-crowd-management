const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true 
  },
  mobile: { 
    type: String, 
    required: true 
  },
  email: { 
    type: String, 
    default: '' 
  },
  serviceType: { 
    type: String, 
    enum: ['Dine-in','Takeaway','Delivery'], 
    required: true 
  },
  address: { 
    // for Delivery: JSON-stringified object of the six fields
    type: String, 
    default: '' 
  },
  lat: Number,
  lng: Number,
  formattedAddress: String,
  items: [
    {
      id: String,
      name: String,
      price: Number,
      qty: Number
    }
  ],
  total: { 
    type: Number, 
    required: true 
  },
  // ← NEW persisted tax/fee fields
  cgstAmount:     { type: Number, default: 0 },
  sgstAmount:     { type: Number, default: 0 },
  deliveryCharge: { type: Number, default: 0 },

  estimatedTime: Number,
  status: { 
    type: String, 
    default: 'Pending' 
  },
  cancellationNote: {
    type: String,
    default: ''
  },
  completedAt: Date,

  // ← feedback fields
  rating: {
    type: Number,
    min: 1,
    max: 5,
    default: null
  },
  feedback: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Order', orderSchema);
