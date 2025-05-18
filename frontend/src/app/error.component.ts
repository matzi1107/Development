import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-error',
  standalone: true,
  template: `<div class="error-container">
    <h2>Fehler</h2>
    <p>Es ist ein Fehler aufgetreten. Bitte versuche es erneut.</p>
    <button (click)="goBack()">Zurück</button>
  </div>`,
  styles: [`
    .error-container {
      max-width: 400px;
      margin: 40px auto;
      padding: 2rem;
      background: #fff0f0;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(255,0,0,0.1);
      color: #b71c1c;
      text-align: center;
    }
    h2 { margin-bottom: 1rem; }
    button {
      margin-top: 1.5rem;
      background: #1976d2;
      color: #fff;
      border: none;
      border-radius: 4px;
      padding: 0.5rem 1.5rem;
      font-size: 1rem;
      cursor: pointer;
    }
  `]
})
export class ErrorComponent {
  constructor(private router: Router) {}
  goBack() {
    this.router.navigateByUrl('/login');
  }
}
