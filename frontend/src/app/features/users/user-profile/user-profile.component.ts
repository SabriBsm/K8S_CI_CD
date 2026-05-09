import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { DividerModule } from 'primeng/divider';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { AuthService } from '../../../core/services/auth.service';
import { AuthUser } from '../../../core/models/auth.model';
import { UserService } from '../../../core/services/user.service';
import { User } from '../../../core/models/user.model';

@Component({
  selector: 'app-user-profile',
  templateUrl: './user-profile.component.html',
  styleUrl: './user-profile.component.scss',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, ButtonModule, DividerModule, InputTextModule, PasswordModule]
})
export class UserProfileComponent implements OnInit {
  currentUser: AuthUser | null = null;
  profileForm!: FormGroup;
  passwordForm!: FormGroup;
  savingProfile = false;
  savingAvatar = false;
  savingPassword = false;
  avatarPreview: string | null = null;
  selectedAvatarFile: File | null = null;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private userService: UserService,
    private messageService: MessageService
  ) {}

  ngOnInit(): void {
    this.authService.currentUser$.subscribe(user => {
      this.currentUser = user;
      this.avatarPreview = user?.avatarUrl || user?.avatar || null;
      this.profileForm = this.fb.group({
        firstName: [user?.firstName ?? '', [Validators.required]],
        lastName:  [user?.lastName ?? '',  [Validators.required]],
        email:     [{ value: user?.email ?? '', disabled: true }],
        jobTitle:  [''],
        department:[''],
        phoneNumber: ['']
      });

      this.profileForm.patchValue({
        jobTitle: user?.jobTitle ?? '',
        department: user?.department ?? '',
        phoneNumber: user?.phoneNumber ?? ''
      });
    });

    this.passwordForm = this.fb.group({
      currentPassword: ['', Validators.required],
      newPassword:     ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', Validators.required]
    });
  }

  saveProfile(): void {
    if (this.profileForm.invalid) { this.profileForm.markAllAsTouched(); return; }
    if (!this.currentUser) return;
    this.savingProfile = true;
    const raw = this.profileForm.getRawValue();
    const payload: Partial<User> = {
      firstName: raw.firstName,
      lastName: raw.lastName,
      jobTitle: raw.jobTitle,
      department: raw.department,
      phoneNumber: raw.phoneNumber,
      avatarUrl: this.currentUser.avatarUrl ?? this.currentUser.avatar
    };

    this.userService.updateUser(this.currentUser.id, payload).subscribe({
      next: (updatedUser) => this.persistAvatarIfNeeded(updatedUser),
      error: () => {
        this.savingProfile = false;
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to save profile changes.' });
      }
    });
  }

  changePassword(): void {
    if (this.passwordForm.invalid) { this.passwordForm.markAllAsTouched(); return; }
    if (!this.currentUser) return;
    const { newPassword, confirmPassword } = this.passwordForm.value;
    if (newPassword !== confirmPassword) {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Passwords do not match.' });
      return;
    }
    this.savingPassword = true;
    this.authService.changePassword(this.currentUser.id, {
      oldPassword: this.passwordForm.value.currentPassword,
      newPassword
    }).subscribe({
      next: () => {
        this.savingPassword = false;
        this.passwordForm.reset();
        this.messageService.add({ severity: 'success', summary: 'Password changed', detail: 'Your password has been updated.' });
      },
      error: () => {
        this.savingPassword = false;
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to update password.' });
      }
    });
  }

  onAvatarSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    this.selectedAvatarFile = file;
    const reader = new FileReader();
    reader.onload = () => {
      this.avatarPreview = String(reader.result || '');
    };
    reader.readAsDataURL(file);
  }

  saveAvatar(): void {
    if (!this.currentUser || !this.selectedAvatarFile) {
      this.messageService.add({ severity: 'warn', summary: 'No photo selected', detail: 'Please choose a photo first.' });
      return;
    }

    this.savingAvatar = true;
    this.userService.uploadAvatar(this.currentUser.id, this.selectedAvatarFile).subscribe({
      next: (userWithAvatar) => {
        this.authService.updateCurrentUser({
          firstName: userWithAvatar.firstName,
          lastName: userWithAvatar.lastName,
          avatarUrl: userWithAvatar.avatarUrl,
          phoneNumber: userWithAvatar.phoneNumber,
          jobTitle: userWithAvatar.jobTitle,
          department: userWithAvatar.department
        });
        this.avatarPreview = userWithAvatar.avatarUrl ?? this.avatarPreview;
        this.selectedAvatarFile = null;
        this.savingAvatar = false;
        this.messageService.add({ severity: 'success', summary: 'Photo saved', detail: 'Your profile photo has been updated.' });
      },
      error: () => {
        this.savingAvatar = false;
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to upload profile photo.' });
      }
    });
  }

  private persistAvatarIfNeeded(updatedUser: User): void {
    if (!this.currentUser) return;

    if (!this.selectedAvatarFile) {
      this.authService.updateCurrentUser({
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
        avatarUrl: updatedUser.avatarUrl,
        phoneNumber: updatedUser.phoneNumber,
        jobTitle: updatedUser.jobTitle,
        department: updatedUser.department
      });
      this.savingProfile = false;
      this.messageService.add({ severity: 'success', summary: 'Profile updated', detail: 'Your profile has been saved.' });
      return;
    }

    this.userService.uploadAvatar(updatedUser.id, this.selectedAvatarFile).subscribe({
      next: (userWithAvatar) => {
        this.authService.updateCurrentUser({
          firstName: userWithAvatar.firstName,
          lastName: userWithAvatar.lastName,
          avatarUrl: userWithAvatar.avatarUrl,
          phoneNumber: userWithAvatar.phoneNumber,
          jobTitle: userWithAvatar.jobTitle,
          department: userWithAvatar.department
        });
        this.avatarPreview = userWithAvatar.avatarUrl ?? this.avatarPreview;
        this.selectedAvatarFile = null;
        this.savingProfile = false;
        this.messageService.add({ severity: 'success', summary: 'Profile updated', detail: 'Your profile has been saved.' });
      },
      error: () => {
        this.authService.updateCurrentUser({
          firstName: updatedUser.firstName,
          lastName: updatedUser.lastName,
          avatarUrl: updatedUser.avatarUrl,
          phoneNumber: updatedUser.phoneNumber,
          jobTitle: updatedUser.jobTitle,
          department: updatedUser.department
        });
        this.selectedAvatarFile = null;
        this.savingProfile = false;
        this.messageService.add({ severity: 'warn', summary: 'Profile updated', detail: 'Your profile was saved, but the photo could not be uploaded.' });
      }
    });
  }

  getInitials(): string {
    if (!this.currentUser) return 'U';
    const firstName = this.currentUser.firstName || '';
    const lastName = this.currentUser.lastName || '';
    if (!firstName && !lastName) return 'U';
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  }

  getRoleLabel(): string {
    const map: Record<string, string> = {
      ADMIN: 'Administrator', PROJECT_MANAGER: 'Project Manager',
      PROJECT_MEMBER: 'Team Member', CUSTOMER: 'Customer'
    };
    return map[this.currentUser?.role ?? ''] ?? '';
  }
}
