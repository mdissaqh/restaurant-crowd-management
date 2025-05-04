const Settings = require('../models/Settings');
const RestaurantStatus = require('../models/RestaurantStatus');

module.exports = async function(req, res, next) {
  const { serviceType } = req.body;

  // Master open/closed
  const rs = await RestaurantStatus.findOne() || await new RestaurantStatus().save();
  if (!rs.isOpen) {
    return res.status(400).json({ error: 'Restaurant is closed' });
  }

  // Per-service availability
  const settings = await Settings.findOne();
  const map = { 'Dine-in': 'dineIn', 'Delivery': 'delivery', 'Takeaway': 'takeaway' };
  const key = map[serviceType];
  if (!settings.serviceAvailability[key]) {
    const msg = serviceType === 'Dine-in'
      ? 'Dining is currently unavailable, As restaurant is completely filled. Until then try Dine-in and Takeaway'
      : 'This service is temporarily not available.';
    return res.status(400).json({ error: msg });
  }

  next();
};
