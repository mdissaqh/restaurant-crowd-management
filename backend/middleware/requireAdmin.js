const auth = require('./auth');
const User = require('../models/User');

module.exports = async function(req, res, next) {
  await auth(req, res, async () => {
    const u = await User.findById(req.user.id);
    if (!u || u.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
    next();
  });
};
