// models/quoteModel.js
class QuoteItem {
  constructor(data) {
    this.qpid = data.qpid;               // Angebotspositions-ID
    this.qid = data.qid;                 // Angebots-ID
    this.description = data.description;
    this.quantity = data.quantity;
    this.unit_price = data.unit_price;
    this.tax_rate = data.tax_rate;
    this.amount = data.amount;
    this.position_order = data.position_order;
    this.naid = data.naid;
    this.nada = data.nada;
    this.aeda = data.aeda;
    this.aeid = data.aeid;
  }
}

class Quote {
  constructor(data) {
    this.qid = data.qid;                 // Angebots-ID
    this.qnr = data.qnr;                 // Angebotsnummer
    this.cust = data.cust;               // Kunden-ID
    this.proj_lnr = data.proj_lnr;       // Projekt-Laufnummer
    this.issued_date = data.issued_date;
    this.valid_until = data.valid_until;
    this.title = data.title;
    this.total_amount = data.total_amount;
    this.mwst = data.mwst;
    this.mwstprz = data.mwstprz;
    this.status = data.status;
    this.notes = data.notes;
    this.naid = data.naid;
    this.nada = data.nada;
    this.aeda = data.aeda;
    this.aeid = data.aeid;
    
    // Zusätzliche Informationen
    this.customerName = data.customerName;
    this.customerCompany = data.customerCompany;
    this.projectName = data.projectName;
  }

  // Status des Angebots berechnen
  calculateStatus() {
    if (this.status === 'cancelled') return 'cancelled';
    if (this.status === 'accepted') return 'accepted';
    
    // Prüfen, ob Angebot abgelaufen ist
    const validUntil = new Date(this.valid_until);
    const today = new Date();
    
    if (validUntil < today) {
      return 'expired';
    }
    
    return this.status;
  }
}

class QuoteDetail {
  constructor(quote, items = []) {
    this.quote = quote;
    this.items = items;
  }
}

module.exports = {
  Quote,
  QuoteItem,
  QuoteDetail
};