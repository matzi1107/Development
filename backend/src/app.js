//Startwithnpmrundev

const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./config/db');
const auth = require('./middleware/auth');
const authRoutes = require('./routes/authRoutes');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./config/swagger');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

/**
 * @swagger
 * tags:
 *   - name: Auth
 *     description: Authentifizierung
 *   - name: Customer
 *     description: Kundenverwaltung
 *   - name: Company
 *     description: Unternehmensverwaltung
 *   - name: Activity
 *     description: Aktivitäten
 *   - name: Invoice
 *     description: Rechnungen
 *   - name: Project
 *     description: Projekte
 *   - name: Quote
 *     description: Angebote
 */

/**
 * @swagger
 * /internal/api/auth/login:
 *   post:
 *     summary: Benutzer-Login
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Erfolgreich eingeloggt
 *       401:
 *         description: Ungültige Zugangsdaten
 *
 * /internal/api/auth/register:
 *   post:
 *     summary: Benutzer-Registrierung
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       201:
 *         description: Benutzer erstellt
 *       400:
 *         description: Fehlerhafte Anfrage
 */

/**
 * @swagger
 * /internal/oneshot/cust:
 *   get:
 *     summary: Alle Kunden abrufen
 *     tags: [Customer]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Liste aller Kunden
 *   post:
 *     summary: Neuen Kunden anlegen
 *     tags: [Customer]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       201:
 *         description: Kunde erstellt
 *
 * /internal/oneshot/cust/{id}:
 *   get:
 *     summary: Einzelnen Kunden abrufen
 *     tags: [Customer]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Kunde gefunden
 *   put:
 *     summary: Kunden aktualisieren
 *     tags: [Customer]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Kunde aktualisiert
 *   delete:
 *     summary: Kunden löschen
 *     tags: [Customer]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       204:
 *         description: Kunde gelöscht
 */

/**
 * @swagger
 * /internal/oneshot/company/settings:
 *   get:
 *     summary: Alle Unternehmenseinstellungen abrufen
 *     tags: [Company]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Liste aller Einstellungen
 *   post:
 *     summary: Neue Unternehmenseinstellung anlegen
 *     tags: [Company]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       201:
 *         description: Einstellung erstellt
 *
 * /internal/oneshot/company/settings/{varkey}:
 *   get:
 *     summary: Unternehmenseinstellung nach Schlüssel abrufen
 *     tags: [Company]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: varkey
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Einstellung gefunden
 *   put:
 *     summary: Unternehmenseinstellung aktualisieren
 *     tags: [Company]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: varkey
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Einstellung aktualisiert
 *   delete:
 *     summary: Unternehmenseinstellung löschen
 *     tags: [Company]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: varkey
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       204:
 *         description: Einstellung gelöscht
 *
 * /internal/oneshot/company/info:
 *   get:
 *     summary: Unternehmensinformationen abrufen
 *     tags: [Company]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Informationen gefunden
 */

/**
 * @swagger
 * /internal/oneshot/activities:
 *   get:
 *     summary: Letzte Aktivitäten abrufen
 *     tags: [Activity]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Liste der Aktivitäten
 */

/**
 * @swagger
 * /internal/oneshot/invoice:
 *   get:
 *     summary: Alle Rechnungen abrufen
 *     tags: [Invoice]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Liste aller Rechnungen
 *   post:
 *     summary: Neue Rechnung anlegen
 *     tags: [Invoice]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       201:
 *         description: Rechnung erstellt
 *
 * /internal/oneshot/invoice/{id}:
 *   get:
 *     summary: Einzelne Rechnung abrufen
 *     tags: [Invoice]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Rechnung gefunden
 *   put:
 *     summary: Rechnung aktualisieren
 *     tags: [Invoice]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Rechnung aktualisiert
 *   delete:
 *     summary: Rechnung löschen
 *     tags: [Invoice]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       204:
 *         description: Rechnung gelöscht
 */

/**
 * @swagger
 * /internal/oneshot/proj:
 *   get:
 *     summary: Alle Projekte abrufen
 *     tags: [Project]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Liste aller Projekte
 *   post:
 *     summary: Neues Projekt anlegen
 *     tags: [Project]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       201:
 *         description: Projekt erstellt
 *
 * /internal/oneshot/proj/{cust}/{lnr}:
 *   get:
 *     summary: Projekt nach Kunde und LNR abrufen
 *     tags: [Project]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: cust
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: lnr
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Projekt gefunden
 *   put:
 *     summary: Projekt aktualisieren
 *     tags: [Project]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: cust
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: lnr
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Projekt aktualisiert
 *   delete:
 *     summary: Projekt löschen
 *     tags: [Project]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: cust
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: lnr
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       204:
 *         description: Projekt gelöscht
 */

/**
 * @swagger
 * /internal/oneshot/quote:
 *   get:
 *     summary: Alle Angebote abrufen
 *     tags: [Quote]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Liste aller Angebote
 *   post:
 *     summary: Neues Angebot anlegen
 *     tags: [Quote]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       201:
 *         description: Angebot erstellt
 *
 * /internal/oneshot/quote/{id}:
 *   get:
 *     summary: Einzelnes Angebot abrufen
 *     tags: [Quote]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Angebot gefunden
 *   put:
 *     summary: Angebot aktualisieren
 *     tags: [Quote]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Angebot aktualisiert
 *   delete:
 *     summary: Angebot löschen
 *     tags: [Quote]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       204:
 *         description: Angebot gelöscht
 */

/**
 * @swagger
 * /internal/api/test:
 *   get:
 *     summary: Test-Endpunkt für Authentifizierung
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Backend API funktioniert
 */

/**
 * @swagger
 * components:
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 */

// Middleware
app.use(cors());
app.use(express.json());

// Swagger UI
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Static files (für die Produktion)
app.use(express.static(path.join(__dirname, '../../frontend/dist/frontend')));

app.use('/internal/api/auth', authRoutes);
app.use('/internal/oneshot/cust', require('./routes/customerRoutes'));
app.use('/api/customers', require('./routes/customerRoutes'));
app.use('/internal/oneshot/company', require('./routes/companyRoutes'));
app.use('/api/company', require('./routes/companyRoutes'));
app.use('/internal/oneshot/activities', require('./routes/activityRoutes'));
app.use('/internal/oneshot/invoice', require('./routes/invoiceRoutes'));
app.use('/internal/oneshot/proj', require('./routes/projectRoutes'));
app.use('/internal/oneshot/quote', require('./routes/quoteRoutes'));
app.use('/api/projects', require('./routes/projectRoutes'));
app.use('/api/invoices', require('./routes/invoiceRoutes'));
app.use('/api/testcompany', require('./middleware/auth').verifyToken, require('./controllers/companyController').getAllCompanySettings);
app.use('/api/quotes', require('./routes/quoteRoutes'));

// API-Routen
app.get('/internal/api/test', auth.verifyToken, (req, res) => {
  res.json({ 
    message: 'Backend API funktioniert!',
    user: req.user
  });
});

// Fallback auf Angular App (für Produktion) - muss die letzte Route sein!
if (process.env.NODE_ENV === 'production') {
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../../frontend/dist/frontend/index.html'));
  });
}

app.listen(port, () => {
  console.log(`Server läuft auf Port ${port}`);
});
