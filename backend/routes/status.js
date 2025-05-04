// backend/routes/categories.js

const express = require('express');
const router = express.Router();
const { list, create, remove } = require('../controllers/categoryController');

router.get('/', list);
router.post('/', create);
router.delete('/:id', remove);

module.exports = router;
