const express = require('express');
const aiController = require('../controllers/aiController');
const upload = require('../middleware/uploadMiddleware');

const router = express.Router();

router.post('/chat', aiController.chat);
router.post('/analyze-pdf', upload.single('file'), aiController.analyzePdf);

module.exports = router;
