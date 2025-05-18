import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-angebote',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './angebote.component.html',
  styleUrls: ['./angebote.component.scss']
})
export class AngeboteComponent implements OnInit {
  quotes: any[] = [];
  loading = false;
  error = '';
  success = '';
  newQuote: any = { items: [] };
  editQuote: any = null;
  customers: any[] = [];
  validationError: string = '';

  ngOnInit() {
    this.loadCustomers();
    this.loadQuotes();
  }

  async loadCustomers() {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/customers', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Fehler beim Laden der Kunden');
      const data = await res.json();
      this.customers = data.map((c: any) => ({ ...c, displayName: (c.betr && c.betr.trim() !== '') ? c.betr : ((c.vname || '') + ' ' + (c.nname || '')).trim() }));
    } catch {
      this.customers = [];
    }
  }

  validatePositions(positions: any[]): string {
    if (!positions.length) return 'Mindestens eine Position ist erforderlich.';
    for (let i = 0; i < positions.length; i++) {
      const p = positions[i];
      if (!p.description || p.description.trim() === '') return `Bezeichnung in Position ${i + 1} fehlt.`;
      if (p.gross === undefined || isNaN(p.gross) || p.gross < 0) return `Brutto in Position ${i + 1} ungültig.`;
      if (p.vat === undefined || isNaN(p.vat) || p.vat < 0) return `Steuersatz in Position ${i + 1} ungültig.`;
      if (p.net === undefined || isNaN(p.net) || p.net < 0) return `Netto in Position ${i + 1} ungültig.`;
    }
    return '';
  }

  addPosition() {
    this.newQuote.items = this.newQuote.items || [];
    this.newQuote.items.push({ description: '', gross: 0, vat: 20, net: 0, quantity: 1 });
    this.updateNet(this.newQuote.items[this.newQuote.items.length - 1]);
    this.calcTotals();
  }

  removePosition(idx: number) {
    this.newQuote.items.splice(idx, 1);
    this.calcTotals();
  }

  updateNet(pos: any) {
    pos.net = +(pos.gross / (1 + pos.vat / 100)).toFixed(2);
  }

  calcTotals() {
    const items = this.newQuote.items || [];
    this.newQuote.totalGross = items.reduce((sum: number, p: any) => sum + (+p.gross || 0), 0);
    this.newQuote.totalNet = items.reduce((sum: number, p: any) => sum + (+p.net || 0), 0);
  }

  async loadQuotes() {
    this.loading = true;
    this.error = '';
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/quotes', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Fehler beim Laden der Angebote');
      const data = await res.json();
      // Korrigiere Brutto/Netto für die Tabelle
      this.quotes = data.map((q: any) => {
        let totalNet = q.totalNet || q.total_net;
        let totalGross = q.totalGross || q.total_gross;
        // Fallback: Wenn Positionen vorhanden, summiere sie
        if ((!totalGross || !totalNet) && q.items && Array.isArray(q.items) && q.items.length > 0) {
          totalNet = q.items.reduce((sum: number, p: any) => sum + (+p.net || +p.unit_price || 0), 0);
          totalGross = q.items.reduce((sum: number, p: any) => sum + (+p.gross || +p.amount || 0), 0);
        }
        // Wenn nur total_amount (Backend: Brutto) und mwstprz vorhanden, rechne korrekt um
        if (!totalNet && q.total_amount && q.mwstprz !== undefined && q.mwstprz !== null) {
          // total_amount ist Brutto
          totalGross = +q.total_amount;
          totalNet = +(q.total_amount / (1 + (q.mwstprz / 100))).toFixed(2);
        }
        // Wenn nur total_amount und mwst vorhanden (Backend: mwst = MwSt-Betrag), rechne korrekt
        if (!totalNet && q.total_amount && q.mwst) {
          totalGross = +q.total_amount;
          totalNet = +(q.total_amount - q.mwst).toFixed(2);
        }
        return { ...q, totalGross, totalNet };
      });
    } catch (e: any) {
      this.error = e.message || 'Fehler beim Laden der Angebote';
      this.quotes = [];
    }
    this.loading = false;
  }

  async createQuote() {
    this.validationError = this.validatePositions(this.newQuote.items);
    if (this.validationError) return;
    this.error = '';
    this.success = '';
    try {
      const token = localStorage.getItem('token');
      // Mapping ins Backend-Format
      const items = (this.newQuote.items || []).map((p: any) => ({
        description: p.description,
        quantity: p.quantity ?? 1,
        unit_price: p.net,
        tax_rate: p.vat,
        amount: p.gross
      }));
      const vat = items.length > 0 ? items[0].tax_rate : 20;
      const mapped = {
        ...this.newQuote,
        cust: this.newQuote.customer,
        title: this.newQuote.title || '',
        issued_date: this.newQuote.date,
        total_amount: this.newQuote.totalNet,
        mwstprz: vat,
        mwst: +(this.newQuote.totalGross - this.newQuote.totalNet).toFixed(2),
        items
      };
      if (!mapped.title) {
        this.validationError = 'Titel ist erforderlich.';
        return;
      }
      if (!mapped.cust || mapped.cust <= 0) {
        this.validationError = 'Kunde ist erforderlich.';
        return;
      }
      const res = await fetch('/api/quotes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(mapped)
      });
      if (!res.ok) throw new Error('Fehler beim Erstellen des Angebots');
      this.success = 'Angebot erfolgreich erstellt!';
      this.newQuote = { items: [] };
      this.loadQuotes();
      // Modal schließen und Backdrop entfernen (wie bei Rechnungen)
      setTimeout(() => {
        const modal = document.getElementById('newQuoteModal');
        if (modal && (window as any).bootstrap) {
          const bsModal = (window as any).bootstrap.Modal.getInstance(modal) || new (window as any).bootstrap.Modal(modal);
          bsModal.hide();
        }
        document.body.classList.remove('modal-open');
        const backdrops = document.querySelectorAll('.modal-backdrop');
        backdrops.forEach(b => b.parentNode?.removeChild(b));
      }, 300);
    } catch (e: any) {
      this.error = e.message || 'Fehler beim Erstellen des Angebots';
    }
  }

  // Utility to get a valid quote ID (qid or id), always as integer
  getQuoteId(quote: any): number {
    const id = quote?.qid ?? quote?.id;
    if (!id || isNaN(+id)) throw new Error('Ungültige Angebots-ID');
    return +id;
  }

  async convertToInvoice(quote: any) {
    this.error = '';
    this.success = '';
    try {
      const token = localStorage.getItem('token');
      const id = this.getQuoteId(quote);
      const res = await fetch(`/api/quotes/${id}/convert-to-invoice`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Fehler beim Konvertieren in Rechnung');
      this.success = 'Angebot wurde in eine Rechnung umgewandelt!';
      this.loadQuotes();
    } catch (e: any) {
      this.error = e.message || 'Fehler beim Konvertieren in Rechnung';
    }
  }

  async editQuoteModal(quote: any) {
    this.editQuote = {
      ...quote,
      customer: quote.customer || quote.cust,
      date: quote.date || quote.issued_date,
      items: []
    };
    try {
      await this.loadQuoteItems(this.getQuoteId(quote));
    } catch (e: any) {
      this.error = e.message || 'Fehler beim Laden der Angebotspositionen';
      return;
    }
    setTimeout(() => {
      const modal = document.getElementById('editQuoteModal');
      if (modal && (window as any).bootstrap) {
        const bsModal = (window as any).bootstrap.Modal.getInstance(modal) || new (window as any).bootstrap.Modal(modal);
        bsModal.show();
      }
    });
  }

  async loadQuoteItems(quoteId: any) {
    try {
      const id = +quoteId;
      if (!id || isNaN(id)) throw new Error('Ungültige Angebots-ID');
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/quotes/${id}/items`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const items = await res.json();
        if (this.editQuote) {
          this.editQuote.items = items.map((item: any) => ({
            ...item,
            description: item.description,
            gross: item.amount, // Brutto
            net: item.unit_price, // Netto
            vat: (item.vat !== undefined ? item.vat : (item.tax_rate !== undefined ? item.tax_rate : 20)),
            quantity: item.quantity ?? 1
          }));
          this.calcEditTotals();
        }
      }
    } catch (e: any) {
      this.error = e.message || 'Fehler beim Laden der Angebotspositionen';
    }
  }

  addEditPosition() {
    if (!this.editQuote.items) this.editQuote.items = [];
    this.editQuote.items.push({ description: '', gross: 0, vat: 20, net: 0, quantity: 1 });
    this.updateEditNet(this.editQuote.items[this.editQuote.items.length - 1]);
    this.calcEditTotals();
  }

  removeEditPosition(idx: number) {
    this.editQuote.items.splice(idx, 1);
    this.calcEditTotals();
  }

  updateEditNet(pos: any) {
    pos.net = +(pos.gross / (1 + pos.vat / 100)).toFixed(2);
  }

  calcEditTotals() {
    const items = this.editQuote.items || [];
    this.editQuote.totalGross = items.reduce((sum: number, p: any) => sum + (+p.gross || 0), 0);
    this.editQuote.totalNet = items.reduce((sum: number, p: any) => sum + (+p.net || 0), 0);
  }

  async saveEditQuote() {
    this.validationError = '';
    if (!this.editQuote.title) {
      this.validationError = 'Titel ist erforderlich.';
      return;
    }
    if (!this.editQuote.customer || this.editQuote.customer <= 0) {
      this.validationError = 'Kunde ist erforderlich.';
      return;
    }
    if (!this.editQuote.items || !this.editQuote.items.length) {
      this.validationError = 'Mindestens eine Position ist erforderlich.';
      return;
    }
    for (let i = 0; i < this.editQuote.items.length; i++) {
      const p = this.editQuote.items[i];
      if (!p.description || p.description.trim() === '') {
        this.validationError = `Bezeichnung in Position ${i + 1} fehlt.`;
        return;
      }
      if (p.gross === undefined || isNaN(p.gross) || p.gross < 0) {
        this.validationError = `Brutto in Position ${i + 1} ungültig.`;
        return;
      }
      if (p.vat === undefined || isNaN(p.vat) || p.vat < 0) {
        this.validationError = `Steuersatz in Position ${i + 1} ungültig.`;
        return;
      }
      if (p.net === undefined || isNaN(p.net) || p.net < 0) {
        this.validationError = `Netto in Position ${i + 1} ungültig.`;
        return;
      }
    }
    try {
      const token = localStorage.getItem('token');
      const id = this.getQuoteId(this.editQuote);
      // 1. Update quote header
      const vat = this.editQuote.items.length > 0 ? this.editQuote.items[0].vat : 20;
      const mapped = {
        title: this.editQuote.title,
        cust: this.editQuote.customer,
        issued_date: this.editQuote.date,
        status: this.editQuote.status,
        total_amount: this.editQuote.totalNet,
        mwstprz: vat,
        mwst: +(this.editQuote.totalGross - this.editQuote.totalNet).toFixed(2)
      };
      const res = await fetch(`/api/quotes/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(mapped)
      });
      if (!res.ok) throw new Error('Fehler beim Speichern des Angebots');
      // 2. Update quote items (delete all and re-add, or diff for add/update/delete)
      // For simplicity: delete all old items, then add all current items
      // (Alternatively, implement a diff for better performance)
      // a) Get all existing items
      const itemsRes = await fetch(`/api/quotes/${id}/items`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      let existingItems: any[] = [];
      if (itemsRes.ok) existingItems = await itemsRes.json();
      // b) Delete all existing items
      for (const item of existingItems) {
        await fetch(`/api/quotes/${id}/items/${item.qpid}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        });
      }
      // c) Add all current items
      for (let i = 0; i < this.editQuote.items.length; i++) {
        const p = this.editQuote.items[i];
        const resp = await fetch(`/api/quotes/${id}/items`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            description: p.description,
            quantity: p.quantity ?? 1,
            unit_price: p.net,
            tax_rate: p.vat,
            amount: p.gross,
            position_order: i + 1
          })
        });
        if (!resp.ok) {
          const err = await resp.json().catch(() => ({}));
          this.validationError = err.message || 'Fehler beim Speichern der Position';
          return;
        }
      }
      this.success = 'Angebot erfolgreich aktualisiert!';
      this.editQuote = null;
      this.loadQuotes();
      setTimeout(() => {
        const modal = document.getElementById('editQuoteModal');
        if (modal && (window as any).bootstrap) {
          const bsModal = (window as any).bootstrap.Modal.getInstance(modal);
          if (bsModal) bsModal.hide();
        }
        document.body.classList.remove('modal-open');
        const backdrops = document.querySelectorAll('.modal-backdrop');
        backdrops.forEach(b => b.parentNode?.removeChild(b));
      }, 300);
    } catch (e: any) {
      this.error = e.message || 'Fehler beim Speichern des Angebots';
    }
  }

  async deleteQuote(quote: any) {
    try {
      const token = localStorage.getItem('token');
      const id = this.getQuoteId(quote);
      const res = await fetch(`/api/quotes/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Fehler beim Löschen des Angebots');
      this.success = 'Angebot erfolgreich gelöscht!';
      this.loadQuotes();
    } catch (e: any) {
      this.error = e.message || 'Fehler beim Löschen des Angebots';
    }
  }
}
