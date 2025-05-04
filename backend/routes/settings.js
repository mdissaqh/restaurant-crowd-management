const express = require('express');
const router  = express.Router();
const Settings = require('../models/Settings');

let cached;
router.get('/', async (req,res) => {
  if (!cached) {
    cached = await Settings.findOne() || await new Settings().save();
  }
  res.json(cached);
});
router.post('/', async (req,res) => {
  cached = await Settings.findOneAndUpdate({}, req.body, { new: true, upsert: true });
  res.json(cached);
});

module.exports = router;
