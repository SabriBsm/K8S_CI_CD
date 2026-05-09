import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { UserService } from '../../../core/services/user.service';
import { User } from '../../../core/models/user.model';

@Component({
  selector: 'app-user-form',
  templateUrl: './user-form.component.html',
  styleUrl: './user-form.component.scss'
})
export class UserFormComponent implements OnChanges {
  private readonly phonePattern = /^\+?[0-9][0-9\s\-()]{6,19}$/;

  @Input() visible = false;
  @Input() user: User | null = null;
  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() saved = new EventEmitter<User>();

  form: FormGroup;
  loading = false;
  isEdit = false;

  roles = [
    { label: 'Administrator',   value: 'ADMIN' },
    { label: 'Project Manager', value: 'PROJECT_MANAGER' },
    { label: 'Project Member',     value: 'PROJECT_MEMBER' },
    { label: 'Customer',        value: 'CUSTOMER' },
    //{ label: 'Client',          value: 'CLIENT' }
  ];

  statuses = [
    { label: 'Active',    value: 'ACTIVE' },
    { label: 'Inactive',  value: 'INACTIVE' },
    { label: 'Pending',   value: 'PENDING' },
    { label: 'Suspended', value: 'SUSPENDED' }
  ];

  constructor(
    private fb: FormBuilder,
    private userService: UserService,
    private messageService: MessageService
  ) {
    this.form = this.buildForm();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['user'] || changes['visible']) {
      this.isEdit = !!this.user;
      this.form = this.buildForm();
      if (this.user) this.form.patchValue(this.user);
    }
  }

  private buildForm(): FormGroup {
    return this.fb.group({
      firstName:  ['', [Validators.required, Validators.minLength(2)]],
      lastName:   ['', [Validators.required, Validators.minLength(2)]],
      email:      ['', [Validators.required, Validators.email]],
      role:       ['PROJECT_MEMBER', Validators.required],
      status:     ['PENDING', Validators.required],
      department: [''],
      jobTitle:   [''],
      phoneNumber:['', [Validators.maxLength(20), Validators.pattern(this.phonePattern)]],
      password:   this.user ? [''] : ['', [Validators.required, Validators.minLength(8)]]
    });
  }

  onSubmit(notifyAfterCreate = false): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.loading = true;

    const value = this.form.getRawValue();

    if (this.isEdit && this.user) {
      const { password, ...updateData } = value;
      this.userService.updateUser(this.user.id, updateData).subscribe({
        next: (u) => this.handleSuccess(u),
        error: (err) => {
          this.loading = false;
          const msg = err?.error?.message || 'Unable to update user. Please try again.';
          this.messageService.add({ severity: 'error', summary: 'Update failed', detail: msg });
        }
      });
    } else {
      this.userService.createUser(value).subscribe({
        next: (u) => {
          if (!notifyAfterCreate) {
            this.handleSuccess(u);
            return;
          }

          this.userService.notifyUser(u.id, { temporaryPassword: value.password }).subscribe({
            next: () => this.handleSuccess(u, true),
            error: () => this.handleSuccess(u, false, true)
          });
        },
        error: (err) => {
          this.loading = false;
          const msg = err?.error?.message || 'Unable to create user. Please try again.';
          this.messageService.add({ severity: 'error', summary: 'Create failed', detail: msg });
        }
      });
    }
  }

  private handleSuccess(user: User, notificationSent = false, notificationFailed = false): void {
    this.loading = false;
    const baseMessage = `User ${this.isEdit ? 'updated' : 'created'} successfully`;
    const detail = notificationSent
      ? 'User created and onboarding email sent successfully.'
      : notificationFailed
        ? 'User created, but the onboarding email could not be sent.'
        : baseMessage;

    this.messageService.add({ severity: notificationFailed ? 'warn' : 'success', summary: 'Success', detail });
    this.saved.emit(user);
  }

  private handleMockSuccess(value: any): void {
    this.loading = false;
    const mockUser: User = {
      id: this.user?.id ?? Math.floor(Math.random() * 1000) + 100,
      ...value,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    this.messageService.add({ severity: 'success', summary: 'Success', detail: `User ${this.isEdit ? 'updated' : 'created'} successfully` });
    this.saved.emit(mockUser);
  }

  close(): void {
    this.visibleChange.emit(false);
  }

  isInvalid(field: string): boolean {
    const c = this.form.get(field);
    return !!(c?.invalid && c?.touched);
  }
}
