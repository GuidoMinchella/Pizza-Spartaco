const express = require('express');
const router = express.Router();

router.get('/carrello', (req, res) => {
  res.json({ page: 'carrello', message: 'Pagina Carrello' });
});

module.exports = router;