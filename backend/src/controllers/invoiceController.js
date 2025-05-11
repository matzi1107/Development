// controllers/invoiceController.js
const invoiceService = require('../services/invoiceService');

// Alle Rechnungen abrufen
exports.getAllInvoices = async (req, res) => {
  try {
    const invoices = await invoiceService.getAllInvoices();
    res.json(invoices);
  } catch (error) {
    console.error('Fehler beim Abrufen der Rechnungen:', error);
    res.status(500).json({ message: 'Interner Serverfehler' });
  }
};

// Rechnung nach ID abrufen
exports.getInvoiceById = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const invoice = await invoiceService.getInvoiceById(id);
    
    if (!invoice) {
      return res.status(404).json({ message: `Rechnung mit ID ${id} wurde nicht gefunden.` });
    }
    
    res.json(invoice);
  } catch (error) {
    console.error('Fehler beim Abrufen der Rechnung:', error);
    res.status(500).json({ message: 'Interner Serverfehler' });
  }
};

// Rechnungsnummer generieren
exports.generateInvoiceNumber = async (req, res) => {
  try {
    const invoiceNumber = await invoiceService.generateInvoiceNumber();
    res.json({ invoiceNumber });
  } catch (error) {
    console.error('Fehler beim Generieren der Rechnungsnummer:', error);
    res.status(500).json({ message: 'Interner Serverfehler' });
  }
};

// Neue Rechnung erstellen
exports.createInvoice = async (req, res) => {
  try {
    const invoiceData = req.body;
    
    // Validierung
    if (!invoiceData.cust || invoiceData.cust <= 0) {
      return res.status(400).json({ message: 'Kundennummer muss größer als 0 sein.' });
    }
    
    if (!invoiceData.total_amount || invoiceData.total_amount <= 0) {
      return res.status(400).json({ message: 'Rechnungsbetrag muss größer als 0 sein.' });
    }
    
    if (!invoiceData.items || !invoiceData.items.length) {
      return res.status(400).json({ message: 'Mindestens eine Rechnungsposition ist erforderlich.' });
    }
    
    // Username aus dem Token für naid verwenden
    const username = req.user?.username || 'system';
    
    const newInvoice = await invoiceService.createInvoice(invoiceData, username);
    res.status(201).json(newInvoice);
  } catch (error) {
    console.error('Fehler bei der Erstellung der Rechnung:', error);
    res.status(500).json({ message: 'Interner Serverfehler' });
  }
};

// Rechnung aktualisieren
exports.updateInvoice = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const invoiceData = req.body;
    
    // Username aus dem Token für naid verwenden
    const username = req.user?.username || 'system';
    
    const updatedInvoice = await invoiceService.updateInvoice(id, invoiceData, username);
    
    if (!updatedInvoice) {
      return res.status(404).json({ message: `Rechnung mit ID ${id} wurde nicht gefunden.` });
    }
    
    res.json(updatedInvoice);
  } catch (error) {
    console.error('Fehler beim Aktualisieren der Rechnung:', error);
    res.status(500).json({ message: 'Interner Serverfehler' });
  }
};

// Rechnung löschen
exports.deleteInvoice = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    
    try {
      const deleted = await invoiceService.deleteInvoice(id);
      
      if (!deleted) {
        return res.status(404).json({ message: `Rechnung mit ID ${id} wurde nicht gefunden.` });
      }
      
      res.json({ message: `Rechnung mit ID ${id} wurde erfolgreich gelöscht.` });
    } catch (error) {
      if (error.message.includes('Zahlungen')) {
        return res.status(409).json({ message: error.message });
      }
      throw error;
    }
  } catch (error) {
    console.error('Fehler beim Löschen der Rechnung:', error);
    res.status(500).json({ message: 'Interner Serverfehler' });
  }
};

// Rechnungspositionen abrufen
exports.getInvoiceItems = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    
    // Prüfen, ob die Rechnung existiert
    const invoice = await invoiceService.getInvoiceById(id);
    if (!invoice) {
      return res.status(404).json({ message: `Rechnung mit ID ${id} wurde nicht gefunden.` });
    }
    
    const items = await invoiceService.getInvoiceItems(id);
    res.json(items);
  } catch (error) {
    console.error('Fehler beim Abrufen der Rechnungspositionen:', error);
    res.status(500).json({ message: 'Interner Serverfehler' });
  }
};

// Rechnungsposition hinzufügen
exports.addInvoiceItem = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const itemData = req.body;
    
    // Validierung
    if (!itemData.description) {
      return res.status(400).json({ message: 'Beschreibung darf nicht leer sein.' });
    }
    
    if (!itemData.quantity || itemData.quantity <= 0) {
      return res.status(400).json({ message: 'Menge muss größer als 0 sein.' });
    }
    
    if (itemData.unit_price < 0) {
      return res.status(400).json({ message: 'Stückpreis darf nicht negativ sein.' });
    }
    
    // Username aus dem Token für naid verwenden
    const username = req.user?.username || 'system';
    
    const newItem = await invoiceService.addInvoiceItem(id, itemData, username);
    res.status(201).json(newItem);
  } catch (error) {
    console.error('Fehler beim Hinzufügen der Rechnungsposition:', error);
    res.status(500).json({ message: 'Interner Serverfehler' });
  }
};

// Rechnungsposition aktualisieren
exports.updateInvoiceItem = async (req, res) => {
  try {
    const invoiceId = parseInt(req.params.id);
    const itemId = parseInt(req.params.itemId);
    const itemData = req.body;
    
    // Username aus dem Token für naid verwenden
    const username = req.user?.username || 'system';
    
    const updatedItem = await invoiceService.updateInvoiceItem(invoiceId, itemId, itemData, username);
    
    if (!updatedItem) {
      return res.status(404).json({ message: `Rechnungsposition mit ID ${itemId} für Rechnung ${invoiceId} wurde nicht gefunden.` });
    }
    
    res.json(updatedItem);
  } catch (error) {
    console.error('Fehler beim Aktualisieren der Rechnungsposition:', error);
    res.status(500).json({ message: 'Interner Serverfehler' });
  }
};

// Rechnungsposition löschen
exports.deleteInvoiceItem = async (req, res) => {
  try {
    const invoiceId = parseInt(req.params.id);
    const itemId = parseInt(req.params.itemId);
    
    // Username aus dem Token für naid verwenden
    const username = req.user?.username || 'system';
    
    const deleted = await invoiceService.deleteInvoiceItem(invoiceId, itemId, username);
    
    if (!deleted) {
      return res.status(404).json({ message: `Rechnungsposition mit ID ${itemId} für Rechnung ${invoiceId} wurde nicht gefunden.` });
    }
    
    res.json({ message: `Rechnungsposition mit ID ${itemId} wurde erfolgreich gelöscht.` });
  } catch (error) {
    console.error('Fehler beim Löschen der Rechnungsposition:', error);
    res.status(500).json({ message: 'Interner Serverfehler' });
  }
};

// Zahlungen abrufen
exports.getInvoicePayments = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    
    // Prüfen, ob die Rechnung existiert
    const invoice = await invoiceService.getInvoiceById(id);
    if (!invoice) {
      return res.status(404).json({ message: `Rechnung mit ID ${id} wurde nicht gefunden.` });
    }
    
    const payments = await invoiceService.getInvoicePayments(id);
    res.json(payments);
  } catch (error) {
    console.error('Fehler beim Abrufen der Zahlungen:', error);
    res.status(500).json({ message: 'Interner Serverfehler' });
  }
};

// Zahlung hinzufügen
exports.addInvoicePayment = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const paymentData = req.body;
    
    // Validierung
    if (!paymentData.amount || paymentData.amount <= 0) {
      return res.status(400).json({ message: 'Zahlungsbetrag muss größer als 0 sein.' });
    }
    
    if (!paymentData.paymethod) {
      return res.status(400).json({ message: 'Zahlungsmethode darf nicht leer sein.' });
    }
    
    // Username aus dem Token für naid verwenden
    const username = req.user?.username || 'system';
    
    try {
      const newPayment = await invoiceService.addInvoicePayment(id, paymentData, username);
      res.status(201).json(newPayment);
    } catch (error) {
      if (error.message.includes('würde den Rechnungsbetrag überschreiten') || 
          error.message.includes('stornierte Rechnungen')) {
        return res.status(400).json({ message: error.message });
      }
      throw error;
    }
  } catch (error) {
    console.error('Fehler beim Hinzufügen der Zahlung:', error);
    res.status(500).json({ message: 'Interner Serverfehler' });
  }
};

// Zahlung löschen
exports.deleteInvoicePayment = async (req, res) => {
  try {
    const invoiceId = parseInt(req.params.id);
    const paymentId = parseInt(req.params.paymentId);
    
    // Username aus dem Token für naid verwenden
    const username = req.user?.username || 'system';
    
    const deleted = await invoiceService.deleteInvoicePayment(invoiceId, paymentId, username);
    
    if (!deleted) {
      return res.status(404).json({ message: `Zahlung mit ID ${paymentId} für Rechnung ${invoiceId} wurde nicht gefunden.` });
    }
    
    res.json({ message: `Zahlung mit ID ${paymentId} wurde erfolgreich gelöscht.` });
  } catch (error) {
    console.error('Fehler beim Löschen der Zahlung:', error);
    res.status(500).json({ message: 'Interner Serverfehler' });
  }
};

// Ausstehende Rechnungen abrufen
exports.getOutstandingInvoices = async (req, res) => {
  try {
    const outstandingInvoices = await invoiceService.getOutstandingInvoices();
    res.json(outstandingInvoices);
  } catch (error) {
    console.error('Fehler beim Abrufen der ausstehenden Rechnungen:', error);
    res.status(500).json({ message: 'Interner Serverfehler' });
  }
};

// PDF-Daten für Rechnung abrufen
exports.getInvoicePdfData = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const pdfData = await invoiceService.getInvoicePdfData(id);
    
    if (!pdfData) {
      return res.status(404).json({ message: `Rechnung mit ID ${id} wurde nicht gefunden.` });
    }
    
    res.json(pdfData);
  } catch (error) {
    console.error('Fehler beim Abrufen der PDF-Daten:', error);
    res.status(500).json({ message: 'Interner Serverfehler' });
  }
};