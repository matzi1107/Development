import { Component } from '@angular/core';
import { RouterModule, Router } from '@angular/router';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [RouterModule],
  template: `
    <nav class="navbar navbar-expand-lg navbar-dark bg-primary shadow-sm sticky-top py-2">
      <div class="container-fluid">
        <a class="navbar-brand fw-bold d-flex align-items-center" routerLink="/dashboard">
          <i class="bi bi-kanban-fill me-2"></i>QADashboard
        </a>
        <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#mainNavbar" aria-controls="mainNavbar" aria-expanded="false" aria-label="Toggle navigation">
          <span class="navbar-toggler-icon"></span>
        </button>
        <div class="collapse navbar-collapse" id="mainNavbar">
          <ul class="navbar-nav me-auto mb-2 mb-lg-0">
            <li class="nav-item"><a class="nav-link" routerLink="/dashboard" routerLinkActive="active">Home</a></li>
            <li class="nav-item"><a class="nav-link" routerLink="/projekte" routerLinkActive="active">Projekte</a></li>
            <li class="nav-item"><a class="nav-link" routerLink="/kunden" routerLinkActive="active">Kunden</a></li>
            <li class="nav-item"><a class="nav-link" routerLink="/rechnungen" routerLinkActive="active">Rechnungen</a></li>
            <li class="nav-item"><a class="nav-link" routerLink="/firmenintern" routerLinkActive="active">Firmenintern</a></li>
            <li class="nav-item"><a class="nav-link" routerLink="/angebote" routerLinkActive="active">Angebote</a></li>
          </ul>
          <button class="btn btn-light d-flex align-items-center gap-2 px-3 fw-semibold" (click)="logout()">
            <i class="bi bi-box-arrow-right"></i> Logout
          </button>
        </div>
      </div>
    </nav>
  `,
  styles: [`
    .navbar-brand {
      font-size: 1.3rem;
      letter-spacing: 0.5px;
    }
    .nav-link.active, .nav-link:focus, .nav-link:hover {
      background: rgba(255,255,255,0.12);
      border-radius: 0.4rem;
    }
    .btn-light {
      border-radius: 0.5rem;
      transition: background 0.2s;
    }
    .btn-light:hover {
      background: #e3f2fd;
    }
  `]
})
export class NavbarComponent {
  constructor(private router: Router) {}
  logout() {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    this.router.navigate(['/login']);
  }
}
