// controllers/quoteController.js
const quoteService = require('../services/quoteService');

// Alle Angebote abrufen
exports.getAllQuotes = async (req, res) => {
  try {
    const quotes = await quoteService.getAllQuotes();
    res.json(quotes);
  } catch (error) {
    console.error('Fehler beim Abrufen der Angebote:', error);
    res.status(500).json({ message: 'Interner Serverfehler' });
  }
};

// Angebot nach ID abrufen
exports.getQuoteById = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const quote = await quoteService.getQuoteById(id);
    
    if (!quote) {
      return res.status(404).json({ message: `Angebot mit ID ${id} wurde nicht gefunden.` });
    }
    
    res.json(quote);
  } catch (error) {
    console.error('Fehler beim Abrufen des Angebots:', error);
    res.status(500).json({ message: 'Interner Serverfehler' });
  }
};

// Angebotsnummer generieren
exports.generateQuoteNumber = async (req, res) => {
  try {
    const quoteNumber = await quoteService.generateQuoteNumber();
    res.json({ quoteNumber });
  } catch (error) {
    console.error('Fehler beim Generieren der Angebotsnummer:', error);
    res.status(500).json({ message: 'Interner Serverfehler' });
  }
};

// Neues Angebot erstellen
exports.createQuote = async (req, res) => {
  try {
    const quoteData = req.body;
    
    // Validierung
    if (!quoteData.cust || quoteData.cust <= 0) {
      return res.status(400).json({ message: 'Kundennummer muss größer als 0 sein.' });
    }
    
    if (!quoteData.title) {
      return res.status(400).json({ message: 'Angebots-Titel ist erforderlich.' });
    }
    
    if (!quoteData.items || !quoteData.items.length) {
      return res.status(400).json({ message: 'Mindestens eine Angebotsposition ist erforderlich.' });
    }
    
    // Username aus dem Token für naid verwenden
    const username = req.user?.username || 'system';
    
    const newQuote = await quoteService.createQuote(quoteData, username);
    res.status(201).json(newQuote);
  } catch (error) {
    console.error('Fehler bei der Erstellung des Angebots:', error);
    res.status(500).json({ message: 'Interner Serverfehler' });
  }
};

// Angebot aktualisieren
exports.updateQuote = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const quoteData = req.body;
    
    // Username aus dem Token für naid verwenden
    const username = req.user?.username || 'system';
    
    const updatedQuote = await quoteService.updateQuote(id, quoteData, username);
    
    if (!updatedQuote) {
      return res.status(404).json({ message: `Angebot mit ID ${id} wurde nicht gefunden.` });
    }
    
    res.json(updatedQuote);
  } catch (error) {
    console.error('Fehler beim Aktualisieren des Angebots:', error);
    res.status(500).json({ message: 'Interner Serverfehler' });
  }
};

// Angebot löschen
exports.deleteQuote = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    
    try {
      const deleted = await quoteService.deleteQuote(id);
      
      if (!deleted) {
        return res.status(404).json({ message: `Angebot mit ID ${id} wurde nicht gefunden.` });
      }
      
      res.json({ message: `Angebot mit ID ${id} wurde erfolgreich gelöscht.` });
    } catch (error) {
      if (error.message.includes('kann nicht gelöscht werden')) {
        return res.status(409).json({ message: error.message });
      }
      throw error;
    }
  } catch (error) {
    console.error('Fehler beim Löschen des Angebots:', error);
    res.status(500).json({ message: 'Interner Serverfehler' });
  }
};

// Angebotspositionen abrufen
exports.getQuoteItems = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    
    // Prüfen, ob das Angebot existiert
    const quote = await quoteService.getQuoteById(id);
    if (!quote) {
      return res.status(404).json({ message: `Angebot mit ID ${id} wurde nicht gefunden.` });
    }
    
    const items = await quoteService.getQuoteItems(id);
    res.json(items);
  } catch (error) {
    console.error('Fehler beim Abrufen der Angebotspositionen:', error);
    res.status(500).json({ message: 'Interner Serverfehler' });
  }
};

// Angebotsposition hinzufügen
exports.addQuoteItem = async (req, res) => {
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
    
    const newItem = await quoteService.addQuoteItem(id, itemData, username);
    res.status(201).json(newItem);
  } catch (error) {
    console.error('Fehler beim Hinzufügen der Angebotsposition:', error);
    res.status(500).json({ message: 'Interner Serverfehler' });
  }
};

// Angebotsposition aktualisieren
exports.updateQuoteItem = async (req, res) => {
  try {
    const quoteId = parseInt(req.params.id);
    const itemId = parseInt(req.params.itemId);
    const itemData = req.body;
    
    // Username aus dem Token für naid verwenden
    const username = req.user?.username || 'system';
    
    const updatedItem = await quoteService.updateQuoteItem(quoteId, itemId, itemData, username);
    
    if (!updatedItem) {
      return res.status(404).json({ message: `Angebotsposition mit ID ${itemId} für Angebot ${quoteId} wurde nicht gefunden.` });
    }
    
    res.json(updatedItem);
  } catch (error) {
    console.error('Fehler beim Aktualisieren der Angebotsposition:', error);
    res.status(500).json({ message: 'Interner Serverfehler' });
  }
};

// Angebotsposition löschen
exports.deleteQuoteItem = async (req, res) => {
  try {
    const quoteId = parseInt(req.params.id);
    const itemId = parseInt(req.params.itemId);
    
    // Username aus dem Token für naid verwenden
    const username = req.user?.username || 'system';
    
    const deleted = await quoteService.deleteQuoteItem(quoteId, itemId, username);
    
    if (!deleted) {
      return res.status(404).json({ message: `Angebotsposition mit ID ${itemId} für Angebot ${quoteId} wurde nicht gefunden.` });
    }
    
    res.json({ message: `Angebotsposition mit ID ${itemId} wurde erfolgreich gelöscht.` });
  } catch (error) {
    console.error('Fehler beim Löschen der Angebotsposition:', error);
    res.status(500).json({ message: 'Interner Serverfehler' });
  }
};

// PDF-Daten für Angebot abrufen
exports.getQuotePdfData = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const pdfData = await quoteService.getQuotePdfData(id);
    
    if (!pdfData) {
      return res.status(404).json({ message: `Angebot mit ID ${id} wurde nicht gefunden.` });
    }
    
    res.json(pdfData);
  } catch (error) {
    console.error('Fehler beim Abrufen der PDF-Daten:', error);
    res.status(500).json({ message: 'Interner Serverfehler' });
  }
};

// Angebot in Rechnung umwandeln
exports.convertToInvoice = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    
    // Username aus dem Token für naid verwenden
    const username = req.user?.username || 'system';
    
    try {
      const result = await quoteService.convertToInvoice(id, username);
      res.json(result);
    } catch (error) {
      if (error.message.includes('Nur versendete oder angenommene Angebote')) {
        return res.status(400).json({ message: error.message });
      }
      if (error.message.includes('nicht gefunden')) {
        return res.status(404).json({ message: error.message });
      }
      throw error;
    }
  } catch (error) {
    console.error('Fehler beim Umwandeln des Angebots in eine Rechnung:', error);
    res.status(500).json({ message: 'Interner Serverfehler' });
  }
};