import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-kunden',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './kunden.component.html',
  styleUrls: ['./kunden.component.scss']
})
export class KundenComponent implements OnInit {
  customers: any[] = [];
  filteredCustomers: any[] = [];
  search: string = '';
  loading = false;
  error = '';
  editCustomer: any = null;
  newCustomer: any = { id: null, vname: '', nname: '', betr: '', str: '', postc: '', town: '' };
  detailsCustomer: any = null;

  ngOnInit() {
    this.loadCustomers();
  }

  async loadCustomers() {
    this.loading = true;
    this.error = '';
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/customers', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Fehler beim Laden der Kunden');
      const data = await res.json();
      this.customers = data.sort((a: any, b: any) => a.cust - b.cust);
      this.filteredCustomers = this.customers;
    } catch {
      this.customers = [];
      this.filteredCustomers = [];
      this.error = 'Fehler beim Laden der Kunden.';
    }
    this.loading = false;
  }

  filterCustomers() {
    const q = this.search.toLowerCase();
    this.filteredCustomers = this.customers.filter(c =>
      (c.betr || '').toLowerCase().includes(q) ||
      (c.vname || '').toLowerCase().includes(q) ||
      (c.nname || '').toLowerCase().includes(q)
    );
  }

  async showDetails(custId: number) {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/customers/${custId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Fehler beim Laden der Details');
      this.detailsCustomer = await res.json();
      // Modal anzeigen
      setTimeout(() => {
        const modal = document.getElementById('detailsCustomerModal');
        if (modal && (window as any).bootstrap) {
          const bsModal = (window as any).bootstrap.Modal.getInstance(modal) || new (window as any).bootstrap.Modal(modal);
          bsModal.show();
        }
      });
    } catch {
      this.error = 'Fehler beim Laden der Kundendetails.';
    }
  }

  closeDetails() {
    this.detailsCustomer = null;
    const modal = document.getElementById('detailsCustomerModal');
    if (modal && (window as any).bootstrap) {
      const bsModal = (window as any).bootstrap.Modal.getInstance(modal);
      if (bsModal) bsModal.hide();
    }
  }

  startEdit(customer: any) {
    this.editCustomer = { ...customer };
    // Details für alle Felder laden, falls nötig
    this.showEditModal();
  }

  showEditModal() {
    setTimeout(() => {
      const modal = document.getElementById('editCustomerModal');
      if (modal && (window as any).bootstrap) {
        const bsModal = (window as any).bootstrap.Modal.getInstance(modal) || new (window as any).bootstrap.Modal(modal);
        bsModal.show();
      }
    });
  }

  cancelEdit() {
    this.editCustomer = null;
    const modal = document.getElementById('editCustomerModal');
    if (modal && (window as any).bootstrap) {
      const bsModal = (window as any).bootstrap.Modal.getInstance(modal);
      if (bsModal) bsModal.hide();
    }
  }

  async saveEdit() {
    try {
      const res = await fetch(`/api/customers/${this.editCustomer.cust}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(this.editCustomer)
      });
      if (res.ok) {
        this.loadCustomers();
        this.cancelEdit();
      } else {
        this.error = 'Fehler beim Speichern.';
      }
    } catch {
      this.error = 'Fehler beim Speichern.';
    }
  }

  async createCustomer() {
    try {
      const maxId = this.customers.reduce((max, c) => Math.max(max, c.cust), 0);
      const newCust = { ...this.newCustomer, cust: maxId + 1 };
      const res = await fetch('/api/customers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(newCust)
      });
      if (res.ok) {
        this.newCustomer = { id: null, vname: '', nname: '', betr: '', str: '', postc: '', town: '' };
        this.loadCustomers();
        // Modal schließen
        const modal = document.getElementById('newCustomerModal');
        if (modal && (window as any).bootstrap) {
          const bsModal = (window as any).bootstrap.Modal.getInstance(modal) || new (window as any).bootstrap.Modal(modal);
          bsModal.hide();
        }
        // Fallback: Modal-Backdrop entfernen, falls noch vorhanden
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
}
