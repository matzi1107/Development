import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import pdfMake from 'pdfmake/build/pdfmake';
import pdfFonts from 'pdfmake/build/vfs_fonts';
pdfMake.vfs = pdfFonts.vfs;

interface InvoicePosition {
  description: string;
  gross: number; // Bruttobetrag
  vat: number;   // Steuersatz in Prozent
  net: number;   // Nettobetrag (berechnet)
}

@Component({
  selector: 'app-rechnungen',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './rechnungen.component.html',
  styleUrls: ['./rechnungen.component.scss']
})
export class RechnungenComponent implements OnInit {
  invoices: any[] = [];
  positions: InvoicePosition[] = [];
  filteredInvoices: any[] = [];
  loading = false;
  error = '';
  editInvoice: any = null;
  newInvoice: any = { renr: '', customer: null, date: '', positions: [], status: '', totalNet: 0, totalGross: 0 };
  customers: any[] = [];
  validationError: string = '';

  ngOnInit() {
    this.loadCustomers();
    this.loadInvoices();
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

  async loadInvoices() {
    this.loading = true;
    this.error = '';
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/invoices', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Fehler beim Laden der Rechnungen');
      const data = await res.json();
      this.invoices = data.map((inv: any) => {
        // Wenn Positionen vorhanden, Summen direkt berechnen
        let totalGross = 0;
        let totalNet = 0;
        if (inv.items && Array.isArray(inv.items) && inv.items.length > 0) {
          totalGross = inv.items.reduce((sum: number, p: any) => sum + (+p.amount || 0), 0);
          totalNet = inv.items.reduce((sum: number, p: any) => sum + (+p.unit_price || 0), 0);
        } else {
          // Fallback: Backend liefert nur total_amount (Netto) und mwstprz
          totalNet = typeof inv.total_amount === 'number' ? inv.total_amount : parseFloat(inv.total_amount || 0);
          const vat = typeof inv.mwstprz === 'number' ? inv.mwstprz : parseFloat(inv.mwstprz || 0);
          totalGross = +(totalNet * (1 + (vat / 100))).toFixed(2);
        }
        const dateRaw = inv.issued_date ?? inv.date ?? inv.datum ?? inv.createdAt ?? '';
        const customer = inv.customerName || inv.customerCompany || inv.customer_company || inv.customer_name || ((inv.vname || '') + ' ' + (inv.nname || ''));
        return {
          ...inv,
          totalGross,
          totalNet,
          date: dateRaw,
          customer,
        };
      });
      this.filteredInvoices = this.invoices;
    } catch {
      this.invoices = [];
      this.filteredInvoices = [];
      this.error = 'Fehler beim Laden der Rechnungen.';
    }
    this.loading = false;
  }

  async startEdit(invoice: any) {
    // Nur mit numerischer ID (reid) arbeiten!
    if (!invoice.reid) {
      this.error = 'Fehler: Keine Rechnungs-ID vorhanden.';
      return;
    }
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/invoices/${invoice.reid}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Fehler beim Laden der Rechnungsdetails');
      const data = await res.json();
      const inv = data.invoice || {};
      this.editInvoice = {
        ...inv,
        customer: inv.cust || inv.customer || null,
        date: inv.issued_date ? inv.issued_date.substring(0, 10) : '',
        status: inv.status || '',
        positions: (data.items || []).map((pos: any) => {
          // Eingabe/Anzeige ist jetzt brutto!
          const gross = pos.amount ?? pos.gross ?? 0;
          const vat = pos.tax_rate ?? 20;
          const net = +(gross / (1 + vat / 100)).toFixed(2);
          return {
            description: pos.description,
            gross,
            vat,
            net,
            quantity: pos.quantity ?? 1
          };
        }),
        totalGross: inv.total_amount ?? 0,
        totalNet: inv.total_amount && inv.mwstprz !== undefined ? +(inv.total_amount / (1 + (inv.mwstprz / 100))).toFixed(2) : 0
      };
      this.calcTotals('edit');
      this.showEditModal();
    } catch {
      this.error = 'Fehler beim Laden der Rechnungspositionen.';
    }
  }

  showEditModal() {
    setTimeout(() => {
      const modal = document.getElementById('editInvoiceModal');
      if (modal && (window as any).bootstrap) {
        const bsModal = (window as any).bootstrap.Modal.getInstance(modal) || new (window as any).bootstrap.Modal(modal);
        bsModal.show();
      }
    });
  }

  cancelEdit() {
    this.editInvoice = null;
    const modal = document.getElementById('editInvoiceModal');
    if (modal && (window as any).bootstrap) {
      const bsModal = (window as any).bootstrap.Modal.getInstance(modal);
      if (bsModal) bsModal.hide();
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

  async saveEdit() {
    this.validationError = this.validatePositions(this.editInvoice.positions);
    if (this.validationError) return;
    // Stelle sicher, dass jede Position eine quantity hat
    const positions = this.editInvoice.positions.map((p: any) => ({
      ...p,
      quantity: p.quantity ?? 1
    }));
    // Steuerberechnung für Gesamtwerte
    const totalNet = this.editInvoice.totalNet;
    const totalGross = this.editInvoice.totalGross;
    const vat = positions.length > 0 ? positions[0].vat : 20;
    const mwst = +(totalGross - totalNet).toFixed(2);
    try {
      // Mapping ins Backend-Format (jetzt brutto -> netto)
      const mapped = {
        ...this.editInvoice,
        cust: this.editInvoice.customer,
        issued_date: this.editInvoice.date,
        total_amount: totalNet,
        mwstprz: vat,
        mwst: mwst,
        items: positions.map((p: any) => ({
          description: p.description,
          quantity: p.quantity,
          unit_price: p.net, // net
          tax_rate: p.vat,
          amount: p.gross, // amount = brutto
          position_order: undefined
        }))
      };
      const res = await fetch(`/api/invoices/${this.editInvoice.reid}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(mapped)
      });
      if (res.ok) {
        this.loadInvoices();
        this.cancelEdit();
      } else {
        this.error = 'Fehler beim Speichern.';
      }
    } catch {
      this.error = 'Fehler beim Speichern.';
    }
  }

  async deleteInvoice(reid: number) {
    if (!confirm('Rechnung wirklich löschen?')) return;
    try {
      const res = await fetch(`/api/invoices/${reid}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.ok) {
        this.loadInvoices();
      } else {
        this.error = 'Fehler beim Löschen.';
      }
    } catch {
      this.error = 'Fehler beim Löschen.';
    }
  }

  addPosition(target: 'edit' | 'new') {
    const pos: InvoicePosition & { quantity?: number } = { description: '', gross: 0, vat: 20, net: 0, quantity: 1 };
    if (target === 'edit') {
      this.editInvoice.positions = this.editInvoice.positions || [];
      this.editInvoice.positions.push(pos);
      this.updateNet(pos);
      this.calcTotals('edit');
    } else {
      this.newInvoice.positions = this.newInvoice.positions || [];
      this.newInvoice.positions.push(pos);
      this.updateNet(pos);
      this.calcTotals('new');
    }
  }

  removePosition(idx: number, target: 'edit' | 'new') {
    if (target === 'edit') {
      this.editInvoice.positions.splice(idx, 1);
    } else {
      this.newInvoice.positions.splice(idx, 1);
    }
  }

  updateNet(pos: InvoicePosition) {
    pos.net = +(pos.gross / (1 + pos.vat / 100)).toFixed(2);
  }

  calcTotals(target: 'edit' | 'new') {
    const positions = target === 'edit' ? this.editInvoice.positions : this.newInvoice.positions;
    const totalGross = positions.reduce((sum: number, p: InvoicePosition) => sum + (+p.gross || 0), 0);
    const totalNet = positions.reduce((sum: number, p: InvoicePosition) => sum + (+p.net || 0), 0);
    if (target === 'edit') {
      this.editInvoice.totalGross = totalGross;
      this.editInvoice.totalNet = totalNet;
    } else {
      this.newInvoice.totalGross = totalGross;
      this.newInvoice.totalNet = totalNet;
    }
  }

  async createInvoice() {
    this.validationError = this.validatePositions(this.newInvoice.positions);
    if (this.validationError) return;
    try {
      // Steuerberechnung für Gesamtwerte
      const totalNet = this.newInvoice.totalNet;
      const totalGross = this.newInvoice.totalGross;
      // Ermittle den durchschnittlichen Steuersatz (für einfache Fälle)
      const vat = this.newInvoice.positions.length > 0 ? this.newInvoice.positions[0].vat : 20;
      const mwst = +(totalGross - totalNet).toFixed(2);
      // Mapping ins Backend-Format (jetzt brutto -> netto)
      const mapped = {
        ...this.newInvoice,
        cust: this.newInvoice.customer,
        issued_date: this.newInvoice.date,
        total_amount: totalNet,
        mwstprz: vat,
        mwst: mwst,
        items: this.newInvoice.positions.map((p: any) => ({
          description: p.description,
          quantity: p.quantity ?? 1,
          unit_price: p.net, // net
          tax_rate: p.vat,
          amount: p.gross, // amount = brutto
          position_order: undefined
        }))
      };
      const res = await fetch('/api/invoices', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(mapped)
      });
      if (res.ok) {
        this.newInvoice = { renr: '', customer: null, date: '', positions: [], status: '', totalNet: 0, totalGross: 0 };
        this.loadInvoices();
        // Modal schließen
        const modal = document.getElementById('newInvoiceModal');
        if (modal && (window as any).bootstrap) {
          const bsModal = (window as any).bootstrap.Modal.getInstance(modal) || new (window as any).bootstrap.Modal(modal);
          bsModal.hide();
        }
        setTimeout(() => {
          document.body.classList.remove('modal-open');
          const backdrops = document.querySelectorAll('.modal-backdrop');
          backdrops.forEach(b => b.parentNode?.removeChild(b));
        }, 300);
      } else {
        this.error = 'Fehler beim Anlegen.';
      }
    } catch {
      this.error = 'Fehler beim Anlegen.';
    }
  }

  async printInvoice(inv: any) {
    // 1. Rechnungsdaten laden (wie bisher)
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`/api/invoices/${inv.reid}/pdf-data`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Fehler beim Laden der Rechnungsdaten');
      const data = await res.json();
      // 2. Daten im localStorage speichern (Schlüssel: invoice-print-data)
      localStorage.setItem('invoice-print-data', JSON.stringify(data));
      // 3. Neues Fenster mit der HTML-Vorlage öffnen
      window.open('/rechnung-vorlage.html?print=1', '_blank');
    } catch (e: any) {
      this.error = e.message || 'Fehler beim Drucken';
    }
  }

  generateInvoicePdf(data: any) {
    const { companyInfo, customer, invoice, items } = data;
    // Summen aus Bruttobeträgen berechnen
    const totalGross = items.reduce((sum: number, item: any) => sum + (typeof item.amount === 'number' ? item.amount : parseFloat(item.amount)), 0);
    // Netto = Brutto / (1 + MwSt/100) je Position
    const totalNet = items.reduce((sum: number, item: any) => {
      const gross = typeof item.amount === 'number' ? item.amount : parseFloat(item.amount);
      const vat = typeof item.tax_rate === 'number' ? item.tax_rate : parseFloat(item.tax_rate);
      return sum + (gross / (1 + vat / 100));
    }, 0);
    // MwSt = Brutto - Netto
    const totalVat = totalGross - totalNet;
    const faelligBis = invoice.due_date ? (invoice.due_date.substring(0, 10)) : '';
    const status = (invoice.status || '').toUpperCase();
    let statusColor = '#0d6efd';
    if (status === 'PAID') statusColor = '#198754';
    if (status === 'OVERDUE') statusColor = '#dc3545';
    if (status === 'DRAFT') statusColor = '#6c757d';
    const accentColor = '#0d6efd';
    const paymentDays = invoice.due_date && invoice.issued_date ? Math.round((new Date(invoice.due_date).getTime() - new Date(invoice.issued_date).getTime()) / (1000*60*60*24)) : null;
    const docDefinition: any = {
      content: [
        // Kopfbereich mit Logo und Firmeninfos
        {
          columns: [
            [
              companyInfo.logoUrl ? { image: companyInfo.logoUrl, width: 90, margin: [0, 0, 0, 8] } : {},
              { text: companyInfo.name, bold: true, fontSize: 18, color: accentColor, margin: [0, 0, 0, 2] },
              { text: companyInfo.street, color: '#495057', fontSize: 11 },
              { text: `${companyInfo.postalCode} ${companyInfo.city}`, color: '#495057', fontSize: 11 },
              { text: `UID: ${companyInfo.vatId}`, color: '#495057', fontSize: 11 }
            ],
            [
              { text: 'RECHNUNG', alignment: 'right', bold: true, fontSize: 28, color: accentColor, margin: [0, 0, 0, 10], letterSpacing: 2 },
              { text: `Status: ${status}`, alignment: 'right', color: statusColor, bold: true, fontSize: 14, margin: [0, 0, 0, 5] },
              { canvas: [ { type: 'rect', x: 0, y: 0, w: 180, h: 3, color: accentColor } ], margin: [0, 0, 0, 10], alignment: 'right' },
              { text: `Rechnungsnummer: ${invoice.renr}`, alignment: 'right', color: '#495057', fontSize: 11 },
              { text: `Rechnungsdatum: ${invoice.issued_date?.substring(0, 10) || ''}`, alignment: 'right', color: '#495057', fontSize: 11 },
              { text: `Fällig am: ${faelligBis}`, alignment: 'right', color: '#495057', fontSize: 11 },
              { text: `Kundennummer: ${invoice.cust}`, alignment: 'right', color: '#495057', fontSize: 11 }
            ]
          ],
          columnGap: 30
        },
        { text: ' ', margin: [0, 16] },
        // Empfänger
        {
          columns: [
            [
              { text: 'Rechnungsempfänger', bold: true, color: accentColor, fontSize: 12, margin: [0, 0, 0, 2] },
              { text: customer.betr || `${customer.vname} ${customer.nname}`, color: '#212529', fontSize: 11 },
              { text: customer.str, color: '#212529', fontSize: 11 },
              { text: `${customer.postc} ${customer.town}`, color: '#212529', fontSize: 11 }
            ]
          ]
        },
        { text: ' ', margin: [0, 10] },
        // Einleitung
        { text: 'Sehr geehrte Damen und Herren,', margin: [0, 0, 0, 4], color: '#212529', fontSize: 11 },
        { text: 'wir erlauben uns, Ihnen folgende Rechnung zu legen:', margin: [0, 0, 0, 14], color: '#212529', fontSize: 11 },
        // Positionstabelle
        {
          table: {
            headerRows: 1,
            widths: ['*', 'auto', 'auto', 'auto', 'auto'],
            body: [
              [
                { text: 'Bezeichnung', bold: true, fillColor: accentColor, color: 'white', fontSize: 11 },
                { text: 'Menge', bold: true, fillColor: accentColor, color: 'white', fontSize: 11 },
                { text: 'Einzelpreis (Netto)', bold: true, fillColor: accentColor, color: 'white', fontSize: 11 },
                { text: 'MwSt (%)', bold: true, fillColor: accentColor, color: 'white', fontSize: 11 },
                { text: 'Betrag (Brutto)', bold: true, fillColor: accentColor, color: 'white', fontSize: 11 }
              ],
              ...items.map((item: any, idx: number) => {
                const gross = typeof item.amount === 'number' ? item.amount : parseFloat(item.amount);
                const vat = typeof item.tax_rate === 'number' ? item.tax_rate : parseFloat(item.tax_rate);
                const net = gross / (1 + vat / 100);
                return [
                  { text: item.description, fillColor: idx % 2 === 0 ? '#f8fafd' : null, color: '#212529', fontSize: 11 },
                  { text: item.quantity, fillColor: idx % 2 === 0 ? '#f8fafd' : null, color: '#212529', fontSize: 11 },
                  { text: this.formatCurrency(net), fillColor: idx % 2 === 0 ? '#f8fafd' : null, color: '#212529', fontSize: 11 },
                  { text: item.tax_rate, fillColor: idx % 2 === 0 ? '#f8fafd' : null, color: '#212529', fontSize: 11 },
                  { text: this.formatCurrency(gross), fillColor: idx % 2 === 0 ? '#f8fafd' : null, color: '#212529', fontSize: 11 }
                ];
              })
            ]
          },
          layout: {
            fillColor: (rowIndex: number) => rowIndex === 0 ? accentColor : null,
            hLineColor: () => accentColor,
            vLineColor: () => accentColor
          },
          margin: [0, 0, 0, 10]
        },
        // Summenbereich modern, inspiriert vom Beispiel
        {
          margin: [0, 20, 0, 0],
          table: {
            widths: ['*', 'auto'],
            body: [
              [
                { text: 'Zwischensumme (Netto)', alignment: 'right', border: [false, true, false, false], margin: [0, 6, 0, 6], bold: true, fontSize: 12 },
                { text: this.formatCurrency(totalNet), alignment: 'right', border: [false, true, false, false], margin: [0, 6, 0, 6], fontSize: 12 }
              ],
              [
                { text: `MwSt (${items[0]?.tax_rate || ''}%)`, alignment: 'right', border: [false, false, false, false], margin: [0, 6, 0, 6], fontSize: 12 },
                { text: this.formatCurrency(totalVat), alignment: 'right', border: [false, false, false, false], margin: [0, 6, 0, 6], fontSize: 12 }
              ],
              [
                { text: 'Gesamtbetrag (Brutto)', alignment: 'right', border: [false, true, false, false], margin: [0, 10, 0, 6], bold: true, fontSize: 14 },
                { text: this.formatCurrency(totalGross), alignment: 'right', border: [false, true, false, false], margin: [0, 10, 0, 6], bold: true, fontSize: 14 }
              ]
            ]
          },
          layout: {
            hLineWidth: (i: number, node: any) => (i === 0 || i === node.table.body.length) ? 1.5 : 0.5,
            vLineWidth: () => 0,
            hLineColor: (i: number, node: any) => (i === 0 || i === node.table.body.length) ? accentColor : '#dee2e6',
            paddingLeft: () => 0,
            paddingRight: () => 0,
            paddingTop: () => 2,
            paddingBottom: () => 2
          }
        },
        // Zahlungsinformation
        { text: 'Zahlungsinformation', style: 'sectionHeader', color: accentColor, margin: [0, 14, 0, 2] },
        { text: paymentDays ? `Zahlbar innerhalb von ${paymentDays} Tagen bis zum ${faelligBis}.` : `Zahlbar bis zum ${faelligBis}.`, margin: [0, 0, 0, 2], color: '#212529', fontSize: 11 },
        {
          table: {
            widths: ['auto', '*'],
            body: [
              [ { text: 'Bank:', bold: true, color: accentColor, fontSize: 11 }, companyInfo.bankName || '-' ],
              [ { text: 'IBAN:', bold: true, color: accentColor, fontSize: 11 }, companyInfo.iban || '-' ],
              [ { text: 'BIC:', bold: true, color: accentColor, fontSize: 11 }, companyInfo.bic || '-' ],
              [ { text: 'Verwendungszweck:', bold: true, color: accentColor, fontSize: 11 }, invoice.renr ]
            ]
          },
          layout: 'noBorders',
          margin: [0, 0, 0, 10]
        },
        // Notizen
        invoice.notes ? { text: invoice.notes, italics: true, fontSize: 10, margin: [0, 0, 0, 10], color: '#495057' } : {},
      ],
      styles: {
        sectionHeader: { fontSize: 14, bold: true, decoration: 'underline', margin: [0, 0, 0, 4] }
      },
      defaultStyle: { fontSize: 10, color: '#212529' },
      pageMargins: [40, 60, 40, 60],
      footer: function(currentPage: number, pageCount: number) {
        return {
          columns: [
            [
              { text: companyInfo.name, bold: true, color: accentColor, fontSize: 10 },
              { text: companyInfo.street, color: '#495057', fontSize: 9 },
              { text: `${companyInfo.postalCode} ${companyInfo.city}`, color: '#495057', fontSize: 9 }
            ],
            [
              { text: `UID: ${companyInfo.vatId}`, color: '#495057', fontSize: 9 },
              { text: `Tel: ${companyInfo.phone}`, color: '#495057', fontSize: 9 },
              { text: `E-Mail: ${companyInfo.email}`, color: '#495057', fontSize: 9 }
            ],
            {
              alignment: 'right',
              text: `Seite ${currentPage} / ${pageCount}`,
              margin: [0, 10, 0, 0],
              color: accentColor,
              fontSize: 10
            }
          ],
          margin: [40, 0, 40, 0],
          fontSize: 8
        };
      }
    };
    pdfMake.createPdf(docDefinition).open();
  }

  formatCurrency(val: number) {
    const num = typeof val === 'number' ? val : parseFloat(val);
    if (isNaN(num)) return '-';
    return `${num.toFixed(2)} €`;
  }

  getCustomerName(custId: number): string {
    const c = this.customers.find(c => c.cust === custId);
    return c ? c.betr : '-';
  }

  getCustomerDisplayName(c: any): string {
    if (!c) return '';
    if (typeof c === 'string') return c;
    if (c.betr && c.betr.trim() !== '') return c.betr;
    const vname = c.vname || '';
    const nname = c.nname || '';
    return (vname + ' ' + nname).trim();
  }

  getCustomerById(id: any) {
    return this.customers.find(c => c.cust === id) || null;
  }

  openInvoiceTemplate() {
    window.open('/assets/rechnung-vorlage.html', '_blank');
  }
}
