// models/invoiceModel.js
class InvoiceItem {
  constructor(data) {
    this.rpid = data.rpid; // Rechnungspositions-ID
    this.reid = data.reid; // Rechnungs-ID
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

class Payment {
  constructor(data) {
    this.payid = data.payid; // Zahlungs-ID
    this.reid = data.reid; // Rechnungs-ID
    this.payda = data.payda; // Zahlungsdatum
    this.amount = data.amount;
    this.paymethod = data.paymethod;
    this.ref = data.ref;
    this.notes = data.notes;
    this.naid = data.naid;
    this.nada = data.nada;
    this.aeda = data.aeda;
    this.aeid = data.aeid;
  }
}

class Invoice {
  constructor(data) {
    this.reid = data.reid; // Rechnungs-ID
    this.renr = data.renr; // Rechnungsnummer
    this.cust = data.cust; // Kunden-ID
    this.proj_lnr = data.proj_lnr; // Projekt-Laufnummer
    this.issued_date = data.issued_date;
    this.due_date = data.due_date;
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
    this.paidAmount = data.paidAmount || 0;
  }

  // Rechnungsstatus berechnen
  calculateStatus(paidAmount) {
    if (this.status === 'cancelled') return 'cancelled';
    
    const isPaid = parseFloat(paidAmount) >= parseFloat(this.total_amount);
    if (isPaid) return 'paid';
    
    const isOverdue = new Date(this.due_date) < new Date();
    if (isOverdue) return 'overdue';
    
    return this.status;
  }
}

class InvoiceDetail {
  constructor(invoice, items = [], payments = []) {
    this.invoice = invoice;
    this.items = items;
    this.payments = payments;
    
    // Bezahlter und ausstehender Betrag
    this.paidAmount = payments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
    this.outstandingAmount = parseFloat(invoice.total_amount) - this.paidAmount;
  }
}

module.exports = {
  Invoice,
  InvoiceItem,
  Payment,
  InvoiceDetail
};