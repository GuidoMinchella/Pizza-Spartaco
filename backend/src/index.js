require('dotenv').config();
const express = require('express');
const cors = require('cors');

const homeRouter = require('./routes/home');
const menuRouter = require('./routes/menu');
const chisiamoRouter = require('./routes/chisiamo');
const contattiRouter = require('./routes/contatti');
const carrelloRouter = require('./routes/carrello');
const healthRouter = require('./routes/health');
const authRouter = require('./routes/auth');
const ordersRouter = require('./routes/orders');
const adminRouter = require('./routes/admin');
const timeslotsRouter = require('./routes/timeslots');
const paymentsRouter = require('./routes/payments');
const { startReviewEmailScheduler } = require('./reviewEmails');

const app = express();
const PORT = process.env.PORT || 3001;

// Limita le origini CORS al/i dominio/i del frontend in produzione
const allowedOrigins = (process.env.CORS_ORIGINS || process.env.FRONTEND_URL || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);
app.use(cors({
  origin: allowedOrigins.length ? allowedOrigins : true,
}));
app.use(express.json());

// Rotte principali
app.use('/', homeRouter);
app.use('/', menuRouter);
app.use('/', chisiamoRouter);
app.use('/', contattiRouter);
app.use('/', carrelloRouter);
app.use('/', healthRouter);
app.use('/', authRouter);
app.use('/', ordersRouter);
app.use('/', adminRouter);
app.use('/', timeslotsRouter);
app.use('/', paymentsRouter);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not Found' });
});

app.listen(PORT, () => {
  console.log(`Backend server in ascolto su http://localhost:${PORT}`);
  try {
    startReviewEmailScheduler();
    console.log('Scheduler email recensioni avviato (ogni 10 minuti).');
  } catch (_) {
    console.log('Impossibile avviare lo scheduler email recensioni.');
  }
});
