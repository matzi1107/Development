import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, RouterModule, CommonModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent {
  username: string = '';
  password: string = '';
  hidePassword: boolean = true;
  error: string = '';

  constructor(private router: Router) {}

  async onLogin() {
    try {
      const res = await fetch('/internal/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: this.username, password: this.password })
      });
      const data = await res.json();
      console.log('Login response:', data); // LOG: Backend-Antwort anzeigen
      if (res.ok && data.success) {
        localStorage.setItem('user', data.user.username);
        localStorage.setItem('token', data.token);
        console.log('Token gespeichert:', localStorage.getItem('token')); // LOG: Token gespeichert?
        this.router.navigate(['/dashboard']);
      } else {
        this.error = data.message || 'Login fehlgeschlagen';
        this.router.navigate(['/error']);
      }
    } catch (e) {
      this.error = 'Serverfehler';
      this.router.navigate(['/error']);
    }
  }
}
