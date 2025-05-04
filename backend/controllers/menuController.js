const MenuItem = require('../models/MenuItem');
const Category = require('../models/Category');

exports.list = async (req, res) => {
  const items = await MenuItem.find();
  res.json(items);
};

exports.create = async (req, res) => {
  try {
    const { name, price, category } = req.body;
    const image = req.file ? `/uploads/${req.file.filename}` : '';
    const item = await MenuItem.create({
      name, price: +price, category, image
    });
    res.status(201).json(item);
  } catch {
    res.status(400).json({ error: 'Create failed' });
  }
};

exports.remove = async (req, res) => {
  try {
    await MenuItem.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch {
    res.status(400).json({ error: 'Delete failed' });
  }
};

exports.getMenuByCategory = async (req, res) => {
  const { category } = req.params;
  try {
    const items = await MenuItem.find({ category });
    res.status(200).json(items);
  } catch (error) {
    console.error("Failed to get menu by category:", error);
    res.status(500).json({ error: "Server error" });
  }
};
