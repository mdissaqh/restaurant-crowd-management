const RestaurantStatus = require('../models/RestaurantStatus');
const ServiceNotice    = require('../models/ServiceNotice');

exports.getStatus = async (req, res) => {
  const st = await RestaurantStatus.findOne() || await RestaurantStatus.create({});
  res.json(st);
};

exports.toggle = async (req, res) => {
  const { isOpen } = req.body;
  const st = await RestaurantStatus.findOneAndUpdate({}, { isOpen }, { new: true, upsert: true });
  res.json(st);
};

exports.getNotice = async (req, res) => {
  const { service } = req.query;
  const n = await ServiceNotice.findOne({ service });
  res.json(n || { service, message: '' });
};

exports.updateNotice = async (req, res) => {
  const { service, message } = req.body;
  const n = await ServiceNotice.findOneAndUpdate({ service }, { message }, { new: true, upsert: true });
  res.json(n);
};
