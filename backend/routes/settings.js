const express = require('express');
const { getSettings, update } = require('../controllers/settingsController');
const router = express.Router();

router.get('/', getSettings);
router.post('/', update);

module.exports = router;
