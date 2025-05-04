const express = require('express');
const jwt     = require('jsonwebtoken');
const User    = require('../models/User');
const router  = express.Router();

// Mobile-only login or signup
router.post('/loginOrSignup', async (req, res) => {
  try {
    const { mobile, name } = req.body;
    let user = await User.findOne({ mobile });
    if (!user) {
      if (!name) return res.status(400).json({ error: 'New users must provide name' });
      user = await User.create({ mobile, name });
    }
    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET);
    res.json({ user, token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Auth failed' });
  }
});

module.exports = router;
