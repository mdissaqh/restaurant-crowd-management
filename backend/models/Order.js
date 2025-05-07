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
  estimatedTime: Number,
  status: { 
    type: String, 
    default: 'Pending' 
  },
  completedAt: Date
}, {
  timestamps: true
});

module.exports = mongoose.model('Order', orderSchema);
