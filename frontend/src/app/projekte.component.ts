import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-projekte',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './projekte.component.html',
  styleUrls: ['./projekte.component.scss']
})
export class ProjekteComponent implements OnInit {
  projects: any[] = [];
  customers: any[] = [];
  loading = false;
  error = '';
  editProject: any = null;
  newProject: any = { pname: '', patches: [], status: 'Aktiv', customer: null };

  ngOnInit() {
    this.loadCustomers().then(() => this.loadProjects());
  }

  async loadCustomers() {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/customers', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Fehler beim Laden der Kunden');
      const data = await res.json();
      this.customers = data.map((c: any) => ({
        id: c.cust,
        label: c.betr ? c.betr : `${c.vname} ${c.nname}`
      }));
    } catch {
      this.customers = [];
    }
  }

  async loadProjects() {
    this.loading = true;
    this.error = '';
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        this.error = 'Nicht eingeloggt.';
        this.loading = false;
        return;
      }
      const res = await fetch('/api/projects', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const contentType = res.headers.get('content-type');
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        this.error = data.message || 'Fehler beim Laden der Projekte.';
        this.loading = false;
        return;
      }
      if (!contentType || !contentType.includes('application/json')) {
        this.error = 'Backend liefert kein JSON (Proxy-Fehler oder falscher Pfad).';
        this.loading = false;
        return;
      }
      const data = await res.json();
      this.projects = data.map((p: any) => ({
        ...p,
        name: p.pname,
        // subproj als patches-Array für die Checkboxen aufbereiten
        patches: p.subproj ? p.subproj.split(',').map((s: string) => s.trim()).filter((s: string) => s) : [],
        status: 'Aktiv',
        id: `${p.cust}/${p.lnr}`,
        customer: this.customers.find((c: any) => c.id === p.cust) || null
      }));
      if (!this.customers.length) await this.loadCustomers();
    } catch (e) {
      this.error = 'Fehler beim Laden der Projekte.';
    }
    this.loading = false;
  }

  startEdit(project: any) {
    // patches als Kopie für die Checkboxen
    this.editProject = { ...project, patches: [...(project.patches || [])] };
  }

  cancelEdit() {
    this.editProject = null;
  }

  async saveEdit() {
    try {
      const [cust, lnr] = this.editProject.id.split('/');
      // patches als subproj-String speichern
      const subproj = (this.editProject.patches || []).join(',');
      const res = await fetch(`/api/projects/${cust}/${lnr}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          pname: this.editProject.name,
          subproj,
          cust: this.editProject.customer?.id || cust
        })
      });
      if (res.ok) {
        this.loadProjects();
        this.editProject = null;
      } else {
        this.error = 'Fehler beim Speichern.';
      }
    } catch {
      this.error = 'Fehler beim Speichern.';
    }
  }

  async deleteProject(id: string) {
    if (!confirm('Projekt wirklich löschen?')) return;
    try {
      const [cust, lnr] = id.split('/');
      const res = await fetch(`/api/projects/${cust}/${lnr}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.ok) {
        this.loadProjects();
      } else {
        this.error = 'Fehler beim Löschen.';
      }
    } catch {
      this.error = 'Fehler beim Löschen.';
    }
  }

  async createProject() {
    try {
      const subproj = (this.newProject.patches || []).join(',');
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          pname: this.newProject.pname,
          subproj,
          status: this.newProject.status,
          cust: this.newProject.customer?.id
        })
      });
      if (res.ok) {
        this.newProject = { pname: '', patches: [], status: 'Aktiv', customer: null };
        this.loadProjects();
        // Modal schließen (Bootstrap 5)
        const modal = document.getElementById('newProjectModal');
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

  onPatchChangeEdit(patch: string, event: any) {
    if (!this.editProject.patches) this.editProject.patches = [];
    if (event.target.checked) {
      if (!this.editProject.patches.includes(patch)) this.editProject.patches.push(patch);
    } else {
      this.editProject.patches = this.editProject.patches.filter((p: string) => p !== patch);
    }
  }

  onPatchChangeNew(patch: string, event: any) {
    if (!this.newProject.patches) this.newProject.patches = [];
    if (event.target.checked) {
      if (!this.newProject.patches.includes(patch)) this.newProject.patches.push(patch);
    } else {
      this.newProject.patches = this.newProject.patches.filter((p: string) => p !== patch);
    }
  }
}
