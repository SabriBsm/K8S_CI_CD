import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AbstractControl, FormBuilder, FormGroup, ValidationErrors, Validators } from '@angular/forms';
import { Message } from 'primeng/api';
import { AuthService } from '../../../core/services/auth.service';

function passwordMatchValidator(control: AbstractControl): ValidationErrors | null {
  const password = control.get('newPassword')?.value;
  const confirm = control.get('confirmPassword')?.value;
  return password && confirm && password !== confirm ? { passwordMismatch: true } : null;
}

@Component({
  selector: 'app-reset-password',
  templateUrl: './reset-password.component.html',
  styleUrl: './reset-password.component.scss'
})
export class ResetPasswordComponent implements OnInit {
  form: FormGroup;
  loading = false;
  submitted = false;
  messages: Message[] = [];
  token: string | null = null;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private route: ActivatedRoute,
    private router: Router
  ) {
    this.form = this.fb.group({
      newPassword: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', Validators.required]
    }, { validators: passwordMatchValidator });
  }

  ngOnInit(): void {
    // Get reset token from URL
    this.token = this.route.snapshot.queryParamMap.get('token');
    if (!this.token) {
      this.messages = [{ severity: 'error', summary: 'Error', detail: 'Invalid or missing reset token' }];
    }
  }

  onSubmit(): void {
    if (this.form.invalid || !this.token) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading = true;
    this.messages = [];

    const { confirmPassword, ...request } = this.form.value;
    const resetRequest = { ...request, token: this.token };

    this.authService.resetPassword(resetRequest).subscribe({
      next: () => {
        this.loading = false;
        this.submitted = true;
        this.messages = [{ severity: 'success', summary: 'Success', detail: 'Password has been reset successfully' }];
        setTimeout(() => this.router.navigate(['/auth/login']), 2000);
      },
      error: (err) => {
        this.loading = false;
        const msg = err?.error?.message || 'Failed to reset password. Please try again.';
        this.messages = [{ severity: 'error', summary: 'Error', detail: msg }];
      }
    });
  }

  isInvalid(field: string): boolean {
    const control = this.form.get(field);
    return !!(control?.invalid && control?.touched);
  }

  getPasswordError(): string | null {
    if (this.form.errors?.['passwordMismatch'] && this.form.get('confirmPassword')?.touched) {
      return 'Passwords do not match';
    }
    return null;
  }
}

