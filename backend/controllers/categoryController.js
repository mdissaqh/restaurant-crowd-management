const Category = require('../models/Category');

exports.list = async (req, res) => {
  const categories = await Category.find().sort('name');
  res.json(categories);
};

exports.create = async (req, res) => {
  try {
    const name = req.body.name.trim();
    if (!name) return res.status(400).json({ error: 'Name required' });
    const exists = await Category.findOne({ name });
    if (exists) return res.status(400).json({ error: 'Category exists' });
    const cat = await Category.create({ name });
    res.status(201).json(cat);
  } catch {
    res.status(500).json({ error: 'Create failed' });
  }
};

exports.remove = async (req, res) => {
  try {
    await Category.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch {
    res.status(400).json({ error: 'Delete failed' });
  }
};
