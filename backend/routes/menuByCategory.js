// backend/routes/menuByCategory.js

const express = require('express');
const router = express.Router();
const { getMenuByCategory } = require('../controllers/menuController');

router.get('/:category', getMenuByCategory);

module.exports = router;
