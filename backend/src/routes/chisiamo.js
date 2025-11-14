const express = require('express');
const router = express.Router();

router.get('/chisiamo', (req, res) => {
  res.json({ page: 'chisiamo', message: 'Pagina Chi Siamo' });
});

module.exports = router;