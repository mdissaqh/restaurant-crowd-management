// Mobile-only login/signup:
const User = require('../models/User');
exports.loginOrSignup = async (req, res) => {
  const { mobile, name } = req.body;
  let user = await User.findOne({ mobile });
  if (!user) {
    // signup new
    if (!name) return res.status(400).json({ error: 'New users must provide name' });
    user = await User.create({ mobile, name });
  }
  const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET);
  res.json({ user, token });
};
