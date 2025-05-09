const { Pool } = require('pg');
const path = require('path');
const fs = require('fs');

// Bestimme die Umgebung
const env = process.env.NODE_ENV || 'development';
const envFile = `.env.${env}`;
const envPath = path.resolve(process.cwd(), envFile);

// Lade die entsprechende .env-Datei
require('dotenv').config({
   path: fs.existsSync(envPath) ? envPath : '.env'
});

console.log(`Datenbankverbindung für Umgebung: ${env}`);

const pool = new Pool({
   host: process.env.DB_HOST,
   port: process.env.DB_PORT,
   database: process.env.DB_NAME,
   user: process.env.DB_USER,
   password: process.env.DB_PASSWORD,
});

// Speichert die aktive Transaktion
let activeClient = null;

// Standard-Abfragefunktion
const query = async (text, params) => {
   // Wenn eine aktive Transaktion existiert, verwende diese
   if (activeClient) {
      return activeClient.query(text, params);
   }
   // Ansonsten verwende den Pool
   return pool.query(text, params);
};

// Transaktion starten
const begin = async () => {
   if (activeClient) {
      throw new Error('Es gibt bereits eine aktive Transaktion');
   }
   activeClient = await pool.connect();
   await activeClient.query('BEGIN');
   return true;
};

// Transaktion committen
const commit = async () => {
   if (!activeClient) {
      throw new Error('Keine aktive Transaktion zum Committen');
   }
   await activeClient.query('COMMIT');
   activeClient.release();
   activeClient = null;
   return true;
};

// Transaktion rollback
const rollback = async () => {
   if (!activeClient) {
      throw new Error('Keine aktive Transaktion für Rollback');
   }
   await activeClient.query('ROLLBACK');
   activeClient.release();
   activeClient = null;
   return true;
};

module.exports = {
   query,
   pool,
   begin,
   commit,
   rollback
};