const Settings = require('../models/Settings');

exports.getSettings = async (req, res) => {
  const s = await Settings.findOne() || await Settings.create({});
  res.json(s);
};

exports.update = async (req, res) => {
  const { restaurantName, logoUrl, deliveryFee, packagingCharge, serviceAvailability, cgst, sgst } = req.body;
  const s = await Settings.findOneAndUpdate({}, {
    restaurantName, logoUrl, deliveryFee, packagingCharge,
    serviceAvailability, tax: { cgst, sgst }
  }, { new: true, upsert: true });
  res.json(s);
};
