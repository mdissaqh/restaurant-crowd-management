const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');

// Get all orders
router.get('/', orderController.getAllOrders);

// Create a new order
router.post('/', orderController.createOrder);

// Update order status
router.put('/:id/status', orderController.updateOrderStatus);

module.exports = router;
