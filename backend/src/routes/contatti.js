const express = require('express');
const router = express.Router();

router.get('/contatti', (req, res) => {
  res.json({ page: 'contatti', message: 'Pagina Contatti' });
});

module.exports = router;