// routes/quoteRoutes.js
const express = require('express');
const router = express.Router();
const quoteController = require('../controllers/quoteController');
const auth = require('../middleware/auth');

// Alle Routen mit Auth-Middleware schützen
router.use(auth.verifyToken);

// Hauptrouten für Angebote
router.get('/', quoteController.getAllQuotes);
router.get('/generate-number', quoteController.generateQuoteNumber);
router.get('/:id', quoteController.getQuoteById);
router.get('/:id/pdf-data', quoteController.getQuotePdfData);
router.post('/', quoteController.createQuote);
router.put('/:id', quoteController.updateQuote);
router.delete('/:id', quoteController.deleteQuote);

// Routen für Angebotspositionen
router.get('/:id/items', quoteController.getQuoteItems);
router.post('/:id/items', quoteController.addQuoteItem);
router.put('/:id/items/:itemId', quoteController.updateQuoteItem);
router.delete('/:id/items/:itemId', quoteController.deleteQuoteItem);

// Spezielle Funktionen
router.post('/:id/convert-to-invoice', quoteController.convertToInvoice);

module.exports = router;