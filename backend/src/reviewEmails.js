const nodemailer = require('nodemailer');
const { supabase, supabaseAdmin, isSupabaseConfigured } = require('./supabaseClient');
const { renderReviewEmailHtml } = require('./reviewEmailTemplate');

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

function parseTimeToDate(baseDate, timeStr) {
  try {
    if (!timeStr) return null;
    const m = String(timeStr).match(/^([01]?\d|2[0-3]):([0-5]\d)$/);
    if (!m) return null;
    const hh = Number(m[1]);
    const mm = Number(m[2]);
    const d = new Date(baseDate);
    d.setHours(hh, mm, 0, 0);
    return d;
  } catch (_) {
    return null;
  }
}

async function runOnce() {
  try {
    if (!isSupabaseConfigured) return;
    const db = supabaseAdmin || supabase;
    if (!db) return;

    // Recupera ordini recenti (ultimi 7 giorni) con email e senza review_email_sent_at
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { data: orders, error } = await db
      .from('orders')
      .select(
        [
          'id',
          'created_at',
          'mode',
          'user_first_name',
          'user_last_name',
          'user_email',
          'delivery_time',
          'pickup_time',
          'review_email_sent_at',
        ].join(', ')
      )
      .gte('created_at', since)
      .is('review_email_sent_at', null);

    if (error) return;
    if (!orders || orders.length === 0) return;

    const transporter = createMailer();
    if (!transporter) return;
    const fromAddr = process.env.FROM_EMAIL || process.env.MAIL_FROM || 'no-reply@spartaco.local';

    const now = new Date();
    for (const o of orders) {
      const baseDate = new Date(o.created_at);
      const sched = o.mode === 'delivery'
        ? parseTimeToDate(baseDate, o.delivery_time)
        : parseTimeToDate(baseDate, o.pickup_time);
      // Se non riusciamo a parseare l'orario, fallback: 24h dopo created_at
      const scheduled = sched || new Date(baseDate.getTime());
      const sendAt = new Date(scheduled.getTime() + 24 * 60 * 60 * 1000);
      if (now < sendAt) continue;
      const email = (o.user_email || '').trim();
      if (!email) continue;
      const name = (o.user_first_name || '').trim() || (o.user_last_name || '').trim() || '';

      const html = renderReviewEmailHtml(name);
      try {
        await transporter.sendMail({
          from: fromAddr,
          to: email,
          subject: 'Com’è andato l’ordine? Lascia una recensione ⭐️',
          html,
        });
        // Aggiorna flag in DB
        await db
          .from('orders')
          .update({ review_email_sent_at: new Date().toISOString() })
          .eq('id', o.id);
      } catch (_) {
        // Non bloccare il ciclo in caso di singolo errore
      }
    }
  } catch (_) {
    // Evita crash dello scheduler
  }
}

function startReviewEmailScheduler() {
  // Esegui una prima passata all’avvio e poi ogni 10 minuti
  runOnce();
  const intervalMs = 10 * 60 * 1000;
  return setInterval(runOnce, intervalMs);
}

module.exports = { startReviewEmailScheduler };
