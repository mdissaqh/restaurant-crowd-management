const auth = require('./auth');
const User = require('../models/User');

module.exports = async function(req, res, next) {
  // first validate token
  await auth(req, res, async () => {
    // then ensure role is admin
    const u = await User.findById(req.user.id);
    if (!u || u.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
    next();
  });
};
