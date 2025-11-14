const express = require('express');
const router = express.Router();

// Inizializza Stripe con la chiave segreta dal .env
let stripe = null;
try {
  const stripeKey = process.env.STRIPE_SECRET_KEY || '';
  if (stripeKey) {
    stripe = require('stripe')(stripeKey);
  }
} catch (_) {}

// POST /payments/create-intent
// Body: { amount: number (in cents), currency: 'eur', receipt_email?: string, metadata?: object }
router.post('/payments/create-intent', async (req, res) => {
  try {
    if (!stripe) {
      return res.status(500).json({ ok: false, error: 'Stripe non configurato. Imposta STRIPE_SECRET_KEY nel .env del backend.' });
    }
    const { amount, currency, receipt_email, metadata } = req.body || {};

    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt <= 0) {
      return res.status(400).json({ ok: false, error: 'Importo non valido per PaymentIntent' });
    }
    const curr = (currency || 'eur').toLowerCase();

    const intent = await stripe.paymentIntents.create({
      amount: Math.round(amt),
      currency: curr,
      receipt_email: receipt_email || undefined,
      metadata: metadata || {},
      automatic_payment_methods: { enabled: true },
    });

    return res.json({ ok: true, clientSecret: intent.client_secret, intentId: intent.id });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message });
  }
});

module.exports = router;