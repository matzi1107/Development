//Start with npm run dev

const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./config/db')
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Static files (für die Produktion)
app.use(express.static(path.join(__dirname, '../../frontend/dist/frontend')));

// API-Routen
app.get('/internal/api/test', (req, res) => {
  res.json({ message: 'Backend API funktioniert!' });
});

app.get('/internal/api/version', (req, res) => {
  res.json({ message: 'Hias seine Version Nummer 1!' });
});

app.get('/internal/api/dbtest', async (req, res) => {
  try {
    const result = await db.query('select * from "int".users');

    res.json({
      success: true,
      count: result.rows.length,
      data: result.rows
    });
  } catch (err) {
    console.error('Datenbankfehler:', err);

    res.status(500).json({
      success: false,
      error: err.message,
      details: err.stack
    });
  }
});

app.get('/internal/api/dbuser', async (req, res) => {
  try {
     const result = await db.query('SELECT current_user, current_database()');
     res.json(result.rows[0]);
  } catch (err) {
     res.status(500).json({ error: err.message });
  }
});

// Fallback auf Angular App (für Produktion)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../../frontend/dist/frontend/index.html'));
});

app.listen(port, () => {
  console.log(`Server läuft auf Port ${port}`);
});
