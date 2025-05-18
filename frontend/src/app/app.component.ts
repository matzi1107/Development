import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NavbarComponent } from './navbar.component';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, NavbarComponent, CommonModule],
  template: `
    <ng-container *ngIf="isAuthRoute(); else showNavbar">
      <router-outlet></router-outlet>
    </ng-container>
    <ng-template #showNavbar>
      <app-navbar></app-navbar>
      <router-outlet></router-outlet>
    </ng-template>
  `,
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  isAuthRoute(): boolean {
    const path = window.location.pathname;
    return path === '/login' || path === '/register' || path === '/error';
  }
}
