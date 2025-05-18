// Script to fix the quotes_qid_seq sequence for the 'quotes' table
// Usage: node fix_quotes_sequence.js
const path = require('path');
const fs = require('fs');
const db = require('./src/config/db');

(async () => {
  try {
    // Set environment to development and load .env.developement
    process.env.NODE_ENV = 'developement';
    require('dotenv').config({
      path: path.resolve(process.cwd(), '.env.developement')
    });

    // Fix the sequence (Schema explizit angeben!)
    const res = await db.query(
      `SELECT setval('"int".quotes_qid_seq', (SELECT COALESCE(MAX(qid), 1) FROM "int".quotes))`
    );
    console.log('quotes_qid_seq wurde erfolgreich angepasst.');
    process.exit(0);
  } catch (err) {
    console.error('Fehler beim Anpassen der Sequence:', err);
    process.exit(1);
  }
})();
