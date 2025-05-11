// routes/invoiceRoutes.js
const express = require('express');
const router = express.Router();
const invoiceController = require('../controllers/invoiceController');
const auth = require('../middleware/auth');

// Alle Routen mit Auth-Middleware schützen
router.use(auth.verifyToken);

// Hauptrouten für Rechnungen
router.get('/', invoiceController.getAllInvoices);
router.get('/outstanding', invoiceController.getOutstandingInvoices);
router.get('/generate-number', invoiceController.generateInvoiceNumber);
router.get('/:id', invoiceController.getInvoiceById);
router.get('/:id/pdf-data', invoiceController.getInvoicePdfData);
router.post('/', invoiceController.createInvoice);
router.put('/:id', invoiceController.updateInvoice);
router.delete('/:id', invoiceController.deleteInvoice);

// Routen für Rechnungspositionen
router.get('/:id/items', invoiceController.getInvoiceItems);
router.post('/:id/items', invoiceController.addInvoiceItem);
router.put('/:id/items/:itemId', invoiceController.updateInvoiceItem);
router.delete('/:id/items/:itemId', invoiceController.deleteInvoiceItem);

// Routen für Zahlungen
router.get('/:id/payments', invoiceController.getInvoicePayments);
router.post('/:id/payments', invoiceController.addInvoicePayment);
router.delete('/:id/payments/:paymentId', invoiceController.deleteInvoicePayment);

module.exports = router;