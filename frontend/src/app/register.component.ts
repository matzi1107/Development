import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [FormsModule, RouterModule, CommonModule],
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.scss']
})
export class RegisterComponent {
  username: string = '';
  password: string = '';
  confirmPassword: string = '';
  hidePassword: boolean = true;
  error: string = '';

  constructor(private router: Router) {}

  async onRegister() {
    try {
      const res = await fetch('/internal/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: this.username, password: this.password, role: 'user' })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        localStorage.setItem('user', data.user.username);
        localStorage.setItem('token', data.token);
        this.router.navigate(['/dashboard']);
      } else {
        this.error = data.message || 'Registrierung fehlgeschlagen';
        this.router.navigate(['/error']);
      }
    } catch (e) {
      this.error = 'Serverfehler';
      this.router.navigate(['/error']);
    }
  }
}
