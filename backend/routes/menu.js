const express = require('express');
const multer  = require('multer');
const path    = require('path');
const { list, create, remove } = require('../controllers/menuController');
const router  = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename:    (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage });

router.get('/', list);
router.post('/', upload.single('image'), create);
router.delete('/:id', remove);

module.exports = router;
