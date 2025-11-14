const express = require('express');
const router = express.Router();
const { supabase, supabaseAdmin, isSupabaseConfigured } = require('../supabaseClient');

// Usa il client admin se disponibile per bypassare RLS nelle letture
const db = supabaseAdmin || supabase;

// Orari di fallback se Supabase non è configurato o la tabella non esiste
const DEFAULT_TIME_SLOTS = [
  '19:00', '19:20', '19:40', '20:00', '20:20', '20:40', '21:00', '21:20', '21:40', '22:00'
];

// GET /timeslots?mode=delivery|pickup
// Ritorna gli slot disponibili per la giornata corrente, escludendo quelli già prenotati
router.get('/timeslots', async (req, res) => {
  try {
    const mode = String((req.query || {}).mode || '').trim();
    // La modalità è opzionale: l'endpoint restituisce gli slot globali disponibili (consegna+asporto)
    // Se presente, viene semplicemente ritornata nel payload di risposta.

    const today = new Date();
    const todayStr = today.toISOString().slice(0, 10); // YYYY-MM-DD

    // Se Supabase non è configurato, ritorna fallback completo
    if (!isSupabaseConfigured || !db) {
      return res.json({ ok: true, date: todayStr, mode, availableSlots: DEFAULT_TIME_SLOTS, bookedSlots: [] });
    }

    // Recupera tutti gli slot abilitati
    const { data: allRows, error: allErr } = await db
      .from('time_slots')
      .select('slot')
      .eq('enabled', true)
      .order('slot', { ascending: true });

    let allSlots = DEFAULT_TIME_SLOTS.slice();
    if (!allErr && Array.isArray(allRows) && allRows.length > 0) {
      allSlots = allRows.map((r) => r.slot);
    }

    // Recupera gli slot già prenotati per oggi (GLOBALI: consegna + asporto)
    let bookedSlots = [];
    const { data: bookedAll, error: bookedErr } = await db
      .from('orders')
      .select('delivery_time,pickup_time')
      .eq('order_date', todayStr);
    if (!bookedErr && Array.isArray(bookedAll)) {
      bookedSlots = bookedAll
        .flatMap((r) => [r.delivery_time, r.pickup_time])
        .filter(Boolean);
    }

    // Calcola disponibili
    const bookedSet = new Set(bookedSlots);
    const availableSlots = allSlots.filter((s) => !bookedSet.has(s));

    return res.json({ ok: true, date: todayStr, mode, availableSlots, bookedSlots });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message });
  }
});

module.exports = router;