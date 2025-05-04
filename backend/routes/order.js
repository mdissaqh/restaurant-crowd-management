const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  items: [
    {
      item: { type: mongoose.Schema.Types.ObjectId, ref: 'MenuItem', required: true },
      quantity: { type: Number, required: true },
    }
  ],
  serviceType: {
    type: String,
    enum: ['Dine-in', 'Takeaway', 'Delivery'],
    required: true
  },
  customerName: { type: String },
  phoneNumber: { type: String },
  status: {
    type: String,
    enum: ['Pending', 'Preparing', 'Ready', 'Completed'],
    default: 'Pending'
  },
  estimatedTime: { type: String }, // e.g., "15 mins"
}, {
  timestamps: true
});

module.exports = mongoose.model('Order', orderSchema);
