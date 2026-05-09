import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Message } from 'primeng/api';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-forgot-password',
  templateUrl: './forgot-password.component.html',
  styleUrl: './forgot-password.component.scss'
})
export class ForgotPasswordComponent {
  form: FormGroup;
  loading = false;
  submitted = false;
  messages: Message[] = [];

  constructor(private fb: FormBuilder, private authService: AuthService) {
    this.form = this.fb.group({
      email: ['', [Validators.required, Validators.email]]
    });
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.loading = true;
    this.messages = [];

    this.authService.forgotPassword(this.form.value.email).subscribe({
      next: () => {
        this.loading = false;
        this.submitted = true;
        this.messages = [{
          severity: 'success',
          summary: 'Success',
          detail: 'If this email exists in our system, you will receive a password reset link shortly. Please check your inbox and spam folder.'
        }];
      },
      error: (err) => {
        this.loading = false;
        // Handle different error scenarios
        let msg = 'Failed to send reset link. Please try again later.';

        if (err?.status === 404) {
          msg = err?.error?.message || 'No user registered with this e-mail.';
        } else if (err?.status === 0) {
          msg = 'Unable to reach the server. Please check your internet connection and try again.';
        } else if (err?.error?.message) {
          msg = err.error.message;
        }

        this.messages = [{ severity: 'error', summary: 'Error', detail: msg }];
      }
    });
  }

  isInvalid(field: string): boolean {
    const control = this.form.get(field);
    return !!(control?.invalid && control?.touched);
  }
}
