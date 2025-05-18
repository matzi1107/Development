import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit {
  projects: any[] = [];
  invoices: any[] = [];
  user: string = '';
  error: string = '';

  ngOnInit() {
    this.user = this.getCurrentUser();
    this.fetchProjects();
    this.fetchInvoices();
  }

  async fetchProjects() {
    this.error = '';
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        this.error = 'Nicht eingeloggt.';
        this.projects = [];
        return;
      }
      const res = await fetch('/api/projects', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const contentType = res.headers.get('content-type');
      if (!res.ok) {
        let msg = 'Fehler beim Laden der Projekte.';
        try {
          const data = await res.json();
          msg = data.message || msg;
        } catch {}
        this.error = msg + ` (Status: ${res.status})`;
        this.projects = [];
        return;
      }
      if (!contentType || !contentType.includes('application/json')) {
        this.error = 'Backend liefert kein JSON (Proxy-Fehler oder falscher Pfad).';
        this.projects = [];
        return;
      }
      const data = await res.json();
      this.projects = data.map((p: any) => ({
        ...p,
        name: p.pname,
        description: p.subproj,
        status: 'Aktiv',
        id: `${p.cust}/${p.lnr}`
      }));
    } catch (e: any) {
      this.error = 'Fehler beim Laden der Projekte.';
      this.projects = [];
    }
  }

  async fetchInvoices() {
    this.error = '';
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        this.error = 'Nicht eingeloggt.';
        this.invoices = [];
        return;
      }
      const res = await fetch('/api/invoices', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const contentType = res.headers.get('content-type');
      if (!res.ok) {
        let msg = 'Fehler beim Laden der Rechnungen.';
        try {
          const data = await res.json();
          msg = data.message || msg;
        } catch {}
        this.error = msg + ` (Status: ${res.status})`;
        this.invoices = [];
        return;
      }
      if (!contentType || !contentType.includes('application/json')) {
        this.error = 'Backend liefert kein JSON (Proxy-Fehler oder falscher Pfad).';
        this.invoices = [];
        return;
      }
      const data = await res.json();
      this.invoices = data.map((inv: any) => {
        // Fallbacks für Netto/Brutto/Datum
        const netto = inv.totalNet ?? inv.total_net ?? inv.netto ?? inv.total_amount ?? 0;
        const brutto = inv.totalGross ?? inv.total_gross ?? inv.brutto ?? (netto && (inv.mwstprz || inv.vat) ? +(netto * (1 + ((inv.mwstprz || inv.vat) / 100))).toFixed(2) : 0);
        const dateRaw = inv.issued_date ?? inv.date ?? inv.datum ?? inv.createdAt ?? '';
        return {
          number: inv.renr,
          project: inv.projectName || inv.proj_lnr || '-',
          amount: brutto,
          brutto,
          netto,
          date: dateRaw,
          dateFmt: dateRaw ? (new Date(dateRaw)).toLocaleDateString('de-DE') : '',
          status: inv.status || '-',
          customer: inv.customerName || inv.customerCompany || ((inv.vname || '') + ' ' + (inv.nname || '')),
          empfaenger: inv.customerName || inv.customerCompany || ((inv.vname || '') + ' ' + (inv.nname || '')),
          paid: inv.paidAmount || inv.paid_amount || 0
        };
      });
    } catch (e: any) {
      this.error = 'Fehler beim Laden der Rechnungen.';
      this.invoices = [];
    }
  }

  getCurrentUser(): string {
    // Dummy-User, später aus Auth holen
    return localStorage.getItem('user') || 'Benutzer';
  }
}
