const express = require('express');
const router = express.Router();
const { supabase, supabaseAdmin, isSupabaseConfigured } = require('../supabaseClient');

router.get('/health/supabase', async (req, res) => {
  if (!isSupabaseConfigured) {
    return res.status(200).json({ ok: false, configured: false, message: 'Variabili Supabase non configurate (SUPABASE_URL e chiave ANON/SERVICE).' });
  }
  try {
    const client = supabaseAdmin || supabase;
    const { data, error } = await client.from('dishes').select('id').limit(1);
    if (error) {
      // Errore nella query: se la tabella non esiste, la connessione è comunque OK
      return res.status(200).json({ ok: true, configured: true, connected: true, tableExists: false, error: { code: error.code, message: error.message } });
    }
    return res.status(200).json({ ok: true, configured: true, connected: true, tableExists: true, sample: data });
  } catch (e) {
    return res.status(500).json({ ok: false, configured: true, connected: false, error: e.message });
  }
});

module.exports = router;