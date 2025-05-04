const express = require('express');
const { range } = require('../controllers/reportController');
const router  = express.Router();

router.get('/', range);

module.exports = router;
