const express = require('express');
const router = express.Router();
const { supabase, supabaseAdmin } = require('../supabaseClient');

router.get('/menu', async (req, res) => {
  const client = supabaseAdmin || supabase;
  if (!client) {
    return res.json({ page: 'menu', source: 'fallback', items: [], message: 'Supabase non configurato' });
  }
  try {
    const { category } = req.query || {};
    let query = client
      .from('dishes')
      .select('id, name, description, category, price_pinsa, price_tonda, price_pala, image, allergens')
      .order('name', { ascending: true });

    if (category) {
      query = query.eq('category', String(category));
    }

    const { data, error } = await query;

    if (error) {
      return res.status(500).json({ page: 'menu', source: 'supabase', items: [], error: { code: error.code, message: error.message } });
    }

    return res.json({ page: 'menu', source: 'supabase', items: data });
  } catch (e) {
    return res.status(500).json({ page: 'menu', source: 'supabase', items: [], error: e.message });
  }
});

module.exports = router;