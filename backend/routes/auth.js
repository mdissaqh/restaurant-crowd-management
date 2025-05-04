const express = require('express');
const router  = express.Router();
const User    = require('../models/User');

// Sign-up (new user)
router.post('/signup', async (req,res) => {
  const { name, mobile } = req.body;
  let user = await User.findOne({ mobile });
  if (user) return res.status(400).json({ error: 'Mobile already registered' });
  user = new User({ name, mobile });
  await user.save();
  res.json(user);
});

// Login (existing)
router.post('/login', async (req,res) => {
  const { mobile } = req.body;
  const user = await User.findOne({ mobile });
  if (!user) return res.status(404).json({ error: 'Not found' });
  res.json(user);
});

module.exports = router;
