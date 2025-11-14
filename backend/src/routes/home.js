const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  res.json({ page: 'home', message: 'Benvenuto nella Home' });
});

module.exports = router;