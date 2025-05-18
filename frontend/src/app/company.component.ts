import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-company',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './company.component.html',
  styleUrls: ['./company.component.scss']
})
export class CompanyComponent implements OnInit {
  company: any = {};
  loading = false;
  error = '';
  success = '';

  async ngOnInit() {
    this.loadCompany();
  }

  async loadCompany() {
    this.loading = true;
    this.error = '';
    try {
      const token = localStorage.getItem('token');
      const url = '/api/company/settings';
      const res = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) {
        let bodyText = await res.text();
        let body: any;
        try { body = JSON.parse(bodyText); } catch { body = bodyText; }
        if (res.status === 404) {
          this.error = '404 Not Found: Die API /api/company/settings wurde nicht gefunden.';
        } else if (res.status === 500) {
          this.error = '500 Serverfehler: Interner Fehler beim Laden der Firmendaten.';
        } else if (res.status === 401 || res.status === 403) {
          this.error = res.status + ': Nicht autorisiert. Token ungültig oder abgelaufen?';
        } else {
          this.error = 'Fehler beim Laden der Firmendaten: ' + (body?.message || res.status);
        }
        return;
      }
      const body = await res.json();
      if (Array.isArray(body)) {
        const mapped: any = {};
        for (const entry of body) {
          mapped[entry.varkey] = entry.varval;
        }
        this.company = mapped;
      } else {
        this.company = body;
      }
    } catch (e: any) {
      this.error = e.message || 'Fehler beim Laden der Firmendaten';
      this.error += '\n' + (e.stack || '');
    }
    this.loading = false;
  }

  async saveCompany() {
    this.error = '';
    this.success = '';
    try {
      const token = localStorage.getItem('token');
      const url = '/api/company/settings';
      const res = await fetch(url, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(this.company)
      });
      if (!res.ok) {
        let bodyText = await res.text();
        let body: any;
        try { body = JSON.parse(bodyText); } catch { body = bodyText; }
        this.error = 'Fehler beim Speichern der Firmendaten: ' + (body?.message || res.status);
        return;
      }
      this.success = 'Firmendaten erfolgreich gespeichert!';
    } catch (e: any) {
      this.error = e.message || 'Fehler beim Speichern der Firmendaten';
      this.error += '\n' + (e.stack || '');
    }
  }
}
