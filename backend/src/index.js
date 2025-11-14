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

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
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
});