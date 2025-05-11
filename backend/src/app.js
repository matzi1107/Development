//Start with npm run dev

const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./config/db');
const auth = require('./middleware/auth');
const authRoutes = require('./routes/authRoutes');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Static files (für die Produktion)
app.use(express.static(path.join(__dirname, '../../frontend/dist/frontend')));

app.use('/internal/api/auth', authRoutes);
app.use('/internal/oneshot/cust', require('./routes/customerRoutes'));
app.use('/internal/oneshot/company', require('./routes/companyRoutes'));
app.use('/internal/oneshot/activities', require('./routes/activityRoutes'));
app.use('/internal/oneshot/invoice', require('./routes/invoiceRoutes'));
app.use('/internal/oneshot/proj', require('./routes/projectRoutes'));
app.use('/internal/oneshot/quote', require('./routes/quoteRoutes'));

// API-Routen
app.get('/internal/api/test', auth.verifyToken, (req, res) => {
  res.json({ 
    message: 'Backend API funktioniert!',
    user: req.user
  });
});

// Fallback auf Angular App (für Produktion)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../../frontend/dist/frontend/index.html'));
});

app.listen(port, () => {
  console.log(`Server läuft auf Port ${port}`);
});
