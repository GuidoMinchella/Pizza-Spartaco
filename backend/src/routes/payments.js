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

    // Limita i metodi di pagamento: solo carta (che include Apple Pay/Google Pay se idonei)
    // e PayPal. In caso di errore/indisponibilità di PayPal sull'account, effettua fallback su sola carta.
    const baseParams = {
      amount: Math.round(amt),
      currency: curr,
      receipt_email: receipt_email || undefined,
      metadata: metadata || {},
    };

    let intent = null;
    try {
      intent = await stripe.paymentIntents.create({
        ...baseParams,
        payment_method_types: ['card', 'paypal'],
      });
    } catch (err) {
      // Fallback: se PayPal non è abilitato/supportato sull'account o genera errore,
      // prova con sola carta. Apple Pay/Google Pay compaiono tramite carta se il dominio è verificato/ambiente idoneo.
      intent = await stripe.paymentIntents.create({
        ...baseParams,
        payment_method_types: ['card'],
      });
    }

    return res.json({ ok: true, clientSecret: intent.client_secret, intentId: intent.id });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message });
  }
});

module.exports = router;
