const express = require('express');
const router = express.Router();
const nodemailer = require('nodemailer');

// Configurazione mailer da .env (SMTP)
function createMailer() {
  try {
    const host = process.env.SMTP_HOST || '';
    const port = Number(process.env.SMTP_PORT || 0) || 587;
    const user = process.env.SMTP_USER || '';
    const pass = process.env.SMTP_PASS || '';
    if (!host || !user || !pass) return null;
    return nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });
  } catch (_) {
    return null;
  }
}

function isValidEmail(email) {
  if (!email) return false;
  const s = String(email).trim();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

function renderOrderEmailHtml(orderId, orderRow, items) {
  const fmtMoney = (n) => `€ ${Number(n).toFixed(2)}`;
  const extrasToText = (arr) => {
    if (!Array.isArray(arr) || arr.length === 0) return '';
    return arr.map((e) => e.name).join(', ');
  };
  const itemsHtml = (items || [])
    .map(
      (it) => `<tr>
        <td style="padding:8px;border:1px solid #eee;">${it.product_name || ''}</td>
        <td style="padding:8px;border:1px solid #eee;">${it.size || ''}</td>
        <td style="padding:8px;border:1px solid #eee;">${it.quantity || 1}</td>
        <td style="padding:8px;border:1px solid #eee;">${extrasToText(it.extras)}</td>
        <td style="padding:8px;border:1px solid #eee;">${fmtMoney(it.unit_price)}</td>
        <td style="padding:8px;border:1px solid #eee;">${fmtMoney(it.total_price)}</td>
      </tr>`
    )
    .join('');

  const modeDetails = orderRow.mode === 'delivery'
    ? `<p><strong>Indirizzo:</strong> ${orderRow.address || ''}</p>
       <p><strong>CAP:</strong> ${orderRow.cap || ''}</p>
       <p><strong>Citofono:</strong> ${orderRow.buzzer || ''}</p>
       <p><strong>Orario consegna:</strong> ${orderRow.delivery_time || ''}</p>
       <p><strong>Pagamento:</strong> ${orderRow.payment_method || ''}</p>`
    : `<p><strong>Nome ritiro:</strong> ${orderRow.pickup_name || ''}</p>
       <p><strong>Indirizzo locale:</strong> Viale Spartaco, 73, 00174</p>
       <p><strong>Orario ritiro:</strong> ${orderRow.pickup_time || ''}</p>`;

  const modeLabel = orderRow.mode === 'delivery'
    ? 'Domicilio'
    : 'Ritiro al locale: Viale Spartaco, 73, 00174';

  return `
  <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#111;">
    <h2 style="margin:0 0 12px;">Riepilogo ordine #${orderId}</h2>
    <p>Grazie per aver ordinato da Pizzeria Spartaco.</p>
    <p><strong>Telefono:</strong> ${orderRow.phone || ''}</p>
    <p><strong>Tipo ordine:</strong> ${modeLabel}</p>
    ${modeDetails}
    <h3 style="margin:16px 0 8px;">Prodotti</h3>
    <table style="border-collapse:collapse;width:100%;">
      <thead>
        <tr>
          <th style="padding:8px;border:1px solid #eee;background:#f9fafb;text-align:left;">Prodotto</th>
          <th style="padding:8px;border:1px solid #eee;background:#f9fafb;text-align:left;">Taglia</th>
          <th style="padding:8px;border:1px solid #eee;background:#f9fafb;text-align:left;">Qtà</th>
          <th style="padding:8px;border:1px solid #eee;background:#f9fafb;text-align:left;">Extra</th>
          <th style="padding:8px;border:1px solid #eee;background:#f9fafb;text-align:left;">Prezzo</th>
          <th style="padding:8px;border:1px solid #eee;background:#f9fafb;text-align:left;">Totale</th>
        </tr>
      </thead>
      <tbody>${itemsHtml}</tbody>
    </table>
    <div style="margin-top:12px;">
      <p><strong>Subtotale:</strong> ${fmtMoney(orderRow.subtotal)}</p>
      <p><strong>Consegna:</strong> ${fmtMoney(orderRow.delivery_fee)}</p>
      <p><strong>Sconto:</strong> ${fmtMoney(orderRow.discount)}</p>
      <p><strong>Totale:</strong> ${fmtMoney(orderRow.total)}</p>
      <p><strong>Pagato:</strong> ${fmtMoney(orderRow.total_paid)}</p>
    </div>
    <p style="margin-top:16px;">Puoi monitorare lo stato del tuo ordine dalla tua Area Personale.</p>
  </div>`;
}
const { supabase, supabaseAdmin, isSupabaseConfigured } = require('../supabaseClient');

// Usa il client admin se disponibile per bypassare RLS nelle scritture
const db = supabaseAdmin || supabase;

// POST /orders - crea un nuovo ordine e relativi articoli
router.post('/orders', async (req, res) => {
  try {
    if (!isSupabaseConfigured || !db) {
      return res.status(500).json({ ok: false, error: 'Supabase non configurato' });
    }

    const payload = req.body || {};
    const {
      user_id,
      user_first_name,
      user_last_name,
      user_email,
      phone,
      mode, // 'delivery' | 'pickup'
      address,
      cap,
      staircase,
      floor,
      buzzer,
      delivery_time,
      pickup_name,
      pickup_time,
      notes_rider,
      payment_method,
      subtotal,
      delivery_fee, // ignorato: il server impone la tariffa corretta
      total, // ignorato per calcolo backend
      items,
    } = payload;

    // Validazione di base
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ ok: false, error: 'Nessun articolo nell\'ordine' });
    }
    if (!mode || (mode !== 'delivery' && mode !== 'pickup')) {
      return res.status(400).json({ ok: false, error: 'Modalità ordine non valida' });
    }
    if (!phone || String(phone).trim().length < 5) {
      return res.status(400).json({ ok: false, error: 'Numero di telefono non valido' });
    }

    if (mode === 'delivery') {
      if (!address || !cap || !buzzer || !delivery_time) {
        return res.status(400).json({ ok: false, error: 'Campi consegna mancanti (indirizzo, CAP, citofono, orario consegna)' });
      }
      if (!payment_method) {
        return res.status(400).json({ ok: false, error: 'Metodo di pagamento mancante' });
      }
      // Consenti consegne solo ai CAP specificati
      const ALLOWED_CAPS = ['00174', '00175', '00173', '00172', '00178', '00169'];
      const capStr = String(cap).trim();
      if (!/^\d{5}$/.test(capStr) || !ALLOWED_CAPS.includes(capStr)) {
        return res.status(400).json({
          ok: false,
          error:
            'Ci dispiace, i nostri rider non arrivano fino a voi. Puoi venire a ritirare direttamente al locale il tuo ordine',
        });
      }

      // Controllo disponibilità slot GLOBALE (consegna + asporto) per la giornata corrente
      try {
        const todayStr = new Date().toISOString().slice(0, 10);
        const { data: bookedAll, error: bookedErr } = await db
          .from('orders')
          .select('delivery_time,pickup_time')
          .eq('order_date', todayStr);
        const conflict = !bookedErr && Array.isArray(bookedAll) && bookedAll.some(
          (r) => r.delivery_time === String(delivery_time) || r.pickup_time === String(delivery_time)
        );
        if (conflict) {
          return res.status(409).json({ ok: false, error: 'Orario di consegna non disponibile. Seleziona un altro orario.' });
        }
      } catch (_) {
        // In caso di errore nella verifica, prosegui ma affida la protezione al vincolo DB
      }
    } else if (mode === 'pickup') {
      if (!pickup_name || !pickup_time) {
        return res.status(400).json({ ok: false, error: 'Campi asporto mancanti (nome, orario ritiro)' });
      }

      // Controllo disponibilità slot GLOBALE (consegna + asporto) per la giornata corrente
      try {
        const todayStr = new Date().toISOString().slice(0, 10);
        const { data: bookedAll, error: bookedErr } = await db
          .from('orders')
          .select('delivery_time,pickup_time')
          .eq('order_date', todayStr);
        const conflict = !bookedErr && Array.isArray(bookedAll) && bookedAll.some(
          (r) => r.delivery_time === String(pickup_time) || r.pickup_time === String(pickup_time)
        );
        if (conflict) {
          return res.status(409).json({ ok: false, error: 'Orario di ritiro non disponibile. Seleziona un altro orario.' });
        }
      } catch (_) {
        // In caso di errore nella verifica, prosegui ma affida la protezione al vincolo DB
      }
    }

    // Calcolo totale base: sempre derivato da subtotal + delivery_fee per coerenza
    const parseNum = (v) => {
      if (v === null || v === undefined || v === '') return 0;
      if (typeof v === 'number') return v;
      const n = parseFloat(String(v));
      return Number.isFinite(n) ? n : 0;
    };
    const round2 = (n) => Number((Math.round(n * 100) / 100).toFixed(2));

    const baseSubtotal = round2(parseNum(subtotal));

    // Impone la fee di consegna lato server: 1,50€ per 'delivery', 0€ per 'pickup'
    const enforcedDeliveryFee = mode === 'delivery' ? 1.5 : 0;
    const baseDeliveryFee = round2(enforcedDeliveryFee);
    const baseTotal = round2(baseSubtotal + baseDeliveryFee);

    // Verifica se è il primo ordine dell'utente per applicare 10% di sconto
    let discount = 0;
    try {
      if (user_id) {
        const { data: prior, error: priorErr } = await db
          .from('orders')
          .select('id')
          .eq('user_id', String(user_id))
          .limit(1);
        if (!priorErr && Array.isArray(prior) && prior.length === 0) {
          discount = round2(baseTotal * 0.10);
        }
      }
    } catch (_) {
      // In caso di errore nel controllo, non applicare sconto
      discount = 0;
    }

    const totalPaid = round2(baseTotal - discount);

    // Inserisci ordine
    const orderRow = {
      user_id: user_id || null,
      user_first_name: user_first_name || null,
      user_last_name: user_last_name || null,
      user_email: user_email || null,
      phone: String(phone),
      mode,
      address: address || null,
      cap: cap || null,
      staircase: staircase || null,
      floor: floor || null,
      buzzer: buzzer || null,
      delivery_time: delivery_time || null,
      pickup_name: pickup_name || null,
      pickup_time: pickup_time || null,
      notes_rider: notes_rider || null,
      payment_method: payment_method || null,
      subtotal: baseSubtotal,
      delivery_fee: baseDeliveryFee,
      total: baseTotal,
      discount,
      total_paid: totalPaid,
    };

    const { data: createdOrder, error: orderErr } = await db
      .from('orders')
      .insert(orderRow)
      .select('id, created_at')
      .single();

    if (orderErr) {
      const msg = orderErr.message || '';
      // Gestione conflitto di unicità (slot già preso) se presenti vincoli DB
      if (orderErr.code === '23505' || msg.toLowerCase().includes('unique') || msg.toLowerCase().includes('duplicate')) {
        const conflictMsg = mode === 'delivery'
          ? 'Orario di consegna non disponibile. Seleziona un altro orario.'
          : 'Orario di ritiro non disponibile. Seleziona un altro orario.';
        return res.status(409).json({ ok: false, error: conflictMsg });
      }
      return res.status(500).json({ ok: false, error: orderErr.message });
    }

    const orderId = createdOrder.id;
    const createdAt = createdOrder.created_at;

    // Inserisci articoli dell'ordine
    const itemRows = items.map((it) => ({
      order_id: orderId,
      product_id: it.product_id,
      product_name: it.product_name,
      size: it.size,
      quantity: it.quantity,
      extras: it.extras || [],
      unit_price: it.unit_price,
      total_price: it.total_price,
    }));

    const { error: itemsErr } = await db.from('order_items').insert(itemRows);
    if (itemsErr) {
      return res.status(500).json({ ok: false, error: itemsErr.message });
    }

    // Invio email riepilogo (best-effort): non blocca l'ordine in caso di errore
    let emailSent = false;
    let emailError = null;
    try {
      if (isValidEmail(user_email)) {
        const transporter = createMailer();
        if (transporter) {
          const html = renderOrderEmailHtml(orderId, {
            ...orderRow,
            created_at: createdAt,
          }, items);
          const fromAddr = process.env.FROM_EMAIL || process.env.MAIL_FROM || `no-reply@spartaco.local`;
          await transporter.sendMail({
            from: fromAddr,
            to: String(user_email).trim(),
            subject: `Riepilogo ordine #${orderId} - Pizzeria Spartaco`,
            html,
          });
          emailSent = true;
        } else {
          emailError = 'Mailer non configurato';
        }
      } else {
        emailError = 'Email utente non valida';
      }
    } catch (e) {
      emailError = e.message || 'Errore invio email';
    }

    return res.status(201).json({ ok: true, orderId, discount, total_paid: totalPaid, email_sent: emailSent, email_error: emailError });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message });
  }
});

// GET /orders?user_id=<uuid> - recupera lo storico ordini dell'utente con relativi articoli
router.get('/orders', async (req, res) => {
  try {
    if (!isSupabaseConfigured) {
      // Se Supabase non è configurato, ritorniamo lista vuota per non rompere il frontend
      return res.status(200).json({ ok: true, orders: [], message: 'Supabase non configurato' });
    }

    const db = supabaseAdmin || supabase;
    if (!db) {
      return res.status(200).json({ ok: true, orders: [], message: 'Client Supabase non disponibile' });
    }

    const { user_id } = req.query || {};
    if (!user_id) {
      return res.status(400).json({ ok: false, error: 'user_id mancante' });
    }

    // Recupera gli ordini dell'utente
    const { data: orders, error: ordersErr } = await db
      .from('orders')
      .select(
        [
          'id',
          'created_at',
          'user_id',
          'phone',
          'mode',
          'address',
          'cap',
          'staircase',
          'floor',
          'buzzer',
          'delivery_time',
          'pickup_name',
          'pickup_time',
          'notes_rider',
          'payment_method',
          'subtotal',
          'delivery_fee',
          'total',
          'discount',
          'total_paid',
        ].join(', ')
      )
      .eq('user_id', String(user_id))
      .order('created_at', { ascending: false });

    if (ordersErr) {
      return res.status(500).json({ ok: false, error: ordersErr.message });
    }

    if (!orders || orders.length === 0) {
      return res.json({ ok: true, orders: [] });
    }

    const orderIds = orders.map((o) => o.id);
    const { data: items, error: itemsErr } = await db
      .from('order_items')
      .select(
        [
          'order_id',
          'product_id',
          'product_name',
          'size',
          'quantity',
          'extras',
          'unit_price',
          'total_price',
        ].join(', ')
      )
      .in('order_id', orderIds);

    if (itemsErr) {
      return res.status(500).json({ ok: false, error: itemsErr.message });
    }

    const byOrder = {};
    for (const it of items || []) {
      if (!byOrder[it.order_id]) byOrder[it.order_id] = [];
      byOrder[it.order_id].push({
        product_id: it.product_id,
        product_name: it.product_name,
        size: it.size,
        quantity: it.quantity,
        extras: Array.isArray(it.extras) ? it.extras : [],
        unit_price: it.unit_price,
        total_price: it.total_price,
      });
    }

    const result = orders.map((o) => ({
      ...o,
      items: byOrder[o.id] || [],
    }));

    return res.json({ ok: true, orders: result });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message });
  }
});

module.exports = router;