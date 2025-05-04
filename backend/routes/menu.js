const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const MenuItem = require('../models/MenuItem');

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage });

router.get('/', async (req, res) => {
  try {
    const items = await MenuItem.find();
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/', upload.single('image'), async (req, res) => {
  try {
    const { name, price, category } = req.body;
    const image = req.file ? `/uploads/${req.file.filename}` : '';
    const item = new MenuItem({ name, price: Number(price), image, category });
    await item.save();
    res.status(201).json(item);
  } catch (err) {
    res.status(400).json({ error: 'Creation failed' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await MenuItem.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: 'Deletion failed' });
  }
});

module.exports = router;