import { Component, OnInit, ViewChild } from '@angular/core';
import { ConfirmationService, MessageService } from 'primeng/api';
import { Table } from 'primeng/table';
import { UserService } from '../../../core/services/user.service';
import { User, UserStatus } from '../../../core/models/user.model';
import { UserRole } from '../../../core/models/auth.model';

@Component({
  selector: 'app-user-list',
  templateUrl: './user-list.component.html',
  styleUrl: './user-list.component.scss'
})
export class UserListComponent implements OnInit {
  @ViewChild('dt') dt!: Table;

  users: User[] = [];
  loading = true;
  totalRecords = 0;
  rows = 10;

  showFormDialog = false;
  selectedUser: User | null = null;
  showNotifyDialog = false;
  notifyTargetUser: User | null = null;
  notifyTemporaryPassword = '';
  notifyLoading = false;

  // Mock data for when backend is not ready
 /* private mockUsers: User[] = [
    { id: 1, firstName: 'Alice',   lastName: 'Martin',   email: 'alice@plansync.io',   role: 'ADMIN',           status: 'ACTIVE',    jobTitle: 'CTO',                department: 'Engineering',  createdAt: '2024-01-10', updatedAt: '2024-01-10', lastLoginAt: '2026-04-04T14:15:00Z', totalAppUsageSeconds: 412500 },
    { id: 2, firstName: 'Bob',     lastName: 'Johnson',  email: 'bob@plansync.io',     role: 'PROJECT_MANAGER', status: 'ACTIVE',    jobTitle: 'PM Lead',            department: 'Product',      createdAt: '2024-02-05', updatedAt: '2024-02-05', lastLoginAt: '2026-04-03T09:10:00Z', totalAppUsageSeconds: 298740 },
    { id: 3, firstName: 'Carol',   lastName: 'Smith',    email: 'carol@plansync.io',   role: 'PROJECT_MEMBER',  status: 'ACTIVE',    jobTitle: 'Frontend Dev',       department: 'Engineering',  createdAt: '2024-02-20', updatedAt: '2024-02-20', lastLoginAt: '2026-04-04T17:25:00Z', totalAppUsageSeconds: 152430 },
    { id: 4, firstName: 'David',   lastName: 'Lee',      email: 'david@plansync.io',   role: 'PROJECT_MEMBER',  status: 'ACTIVE',    jobTitle: 'Backend Dev',        department: 'Engineering',  createdAt: '2024-03-01', updatedAt: '2024-03-01', lastLoginAt: '2026-04-02T08:40:00Z', totalAppUsageSeconds: 198765 },
    { id: 5, firstName: 'Emma',    lastName: 'Wilson',   email: 'emma@acme.com',       role: 'CLIENT',          status: 'ACTIVE',    jobTitle: 'Product Owner',      department: 'ACME Corp',    createdAt: '2024-03-15', updatedAt: '2024-03-15', lastLoginAt: '2026-04-01T13:05:00Z', totalAppUsageSeconds: 98760 },
    { id: 6, firstName: 'Frank',   lastName: 'Brown',    email: 'frank@plansync.io',   role: 'PROJECT_MANAGER', status: 'INACTIVE',  jobTitle: 'Senior PM',          department: 'Product',      createdAt: '2024-04-01', updatedAt: '2024-04-01', lastLoginAt: '2026-03-20T10:30:00Z', totalAppUsageSeconds: 521400 },
    { id: 7, firstName: 'Grace',   lastName: 'Taylor',   email: 'grace@plansync.io',   role: 'PROJECT_MEMBER',  status: 'ACTIVE',    jobTitle: 'QA Engineer',        department: 'Engineering',  createdAt: '2024-04-10', updatedAt: '2024-04-10', lastLoginAt: '2026-04-03T16:50:00Z', totalAppUsageSeconds: 74320 },
    { id: 8, firstName: 'Henry',   lastName: 'Anderson', email: 'henry@startup.com',   role: 'CLIENT',          status: 'PENDING',   jobTitle: 'CEO',                department: 'StartupXYZ',   createdAt: '2024-05-01', updatedAt: '2024-05-01', lastLoginAt: undefined, totalAppUsageSeconds: 0 },
    { id: 9, firstName: 'Isabelle',lastName: 'Dupont',   email: 'isabelle@plansync.io',role: 'PROJECT_MEMBER',  status: 'ACTIVE',    jobTitle: 'UX Designer',        department: 'Design',       createdAt: '2024-05-15', updatedAt: '2024-05-15', lastLoginAt: '2026-04-04T11:20:00Z', totalAppUsageSeconds: 126540 },
    { id: 10,firstName: 'James',   lastName: 'Clark',    email: 'james@plansync.io',   role: 'PROJECT_MEMBER',  status: 'SUSPENDED', jobTitle: 'DevOps Engineer',    department: 'Engineering',  createdAt: '2024-06-01', updatedAt: '2024-06-01', lastLoginAt: '2026-03-01T07:15:00Z', totalAppUsageSeconds: 4440 }
  ];*/

  constructor(
    private userService: UserService,
    private messageService: MessageService,
    private confirmationService: ConfirmationService
  ) {}

  ngOnInit(): void {
    this.loadUsers();
  }

  loadUsers(): void {
    this.loading = true;
    this.userService.getUsers().subscribe({
      next: (res) => {
        this.users = res.content;
        this.totalRecords = res.totalElements;
        this.loading = false;
      },
      error: () => {
        // fallback to mock data when backend is not ready
        /*this.users = this.mockUsers;
        this.totalRecords = this.mockUsers.length;*/
        this.loading = false;
      }
    });
  }

  openNewUser(): void {
    this.selectedUser = null;
    this.showFormDialog = true;
  }

  editUser(user: User): void {
    this.selectedUser = { ...user };
    this.showFormDialog = true;
  }

  openNotifyDialog(user: User): void {
    this.notifyTargetUser = user;
    this.notifyTemporaryPassword = this.generateTemporaryPassword();
    this.showNotifyDialog = true;
  }

  sendUserNotification(): void {
    if (!this.notifyTargetUser) return;
    const targetEmail = this.notifyTargetUser.email;
    const temporaryPassword = (this.notifyTemporaryPassword || '').trim();
    if (temporaryPassword.length < 8) {
      this.messageService.add({
        severity: 'error',
        summary: 'Invalid password',
        detail: 'Temporary password must contain at least 8 characters.'
      });
      return;
    }

    this.notifyLoading = true;
    this.userService.notifyUser(this.notifyTargetUser.id, { temporaryPassword }).subscribe({
      next: () => {
        this.notifyLoading = false;
        this.showNotifyDialog = false;
        this.notifyTargetUser = null;
        this.messageService.add({
          severity: 'success',
          summary: 'Notification sent',
          detail: `Onboarding email sent to ${targetEmail}.`
        });
      },
      error: () => {
        this.notifyLoading = false;
        this.messageService.add({
          severity: 'error',
          summary: 'Notification failed',
          detail: 'Unable to send the onboarding email.'
        });
      }
    });
  }

  closeNotifyDialog(): void {
    this.showNotifyDialog = false;
    this.notifyTargetUser = null;
    this.notifyTemporaryPassword = '';
    this.notifyLoading = false;
  }

  deleteUser(user: User): void {
    this.confirmationService.confirm({
      message: `Delete user <strong>${user.firstName} ${user.lastName}</strong>? This action cannot be undone.`,
      header: 'Confirm Delete',
      icon: 'pi pi-exclamation-triangle',
      acceptButtonStyleClass: 'p-button-danger p-button-sm',
      accept: () => {
        this.userService.deleteUser(user.id).subscribe({
          next: () => {
            this.users = this.users.filter(u => u.id !== user.id);
            this.messageService.add({ severity: 'success', summary: 'Deleted', detail: 'User removed successfully' });
          },
          error: () => {
            // mock delete
            this.users = this.users.filter(u => u.id !== user.id);
            this.messageService.add({ severity: 'success', summary: 'Deleted', detail: 'User removed successfully' });
          }
        });
      }
    });
  }

  onFormSaved(user: User): void {
    if (this.selectedUser) {
      const idx = this.users.findIndex(u => u.id === user.id);
      if (idx !== -1) this.users[idx] = user;
    } else {
      this.users = [user, ...this.users];
    }
    this.showFormDialog = false;
  }

  onSearch(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.dt.filterGlobal(value, 'contains');
  }

  getRoleClass(role: UserRole): string {
    const map: Record<UserRole, string> = {
      ADMIN: 'role-admin',
      MANAGER: 'role-admin',
      ROLE_MANAGER: 'role-admin',
      PROJECT_MANAGER: 'role-pm',
      PROJECT_MEMBER: 'role-member',
      TEAM_MEMBER: 'role-member',
      ROLE_TEAM_MEMBER: 'role-member',
      CUSTOMER: 'role-customer',
      CLIENT: 'role-customer',
      ROLE_CLIENT: 'role-customer',

    };
    return map[role] ?? '';
  }

  getRoleLabel(role: UserRole): string {
    const map: Record<UserRole, string> = {
      ADMIN: 'Admin',
      MANAGER: 'Manager',
      ROLE_MANAGER: 'Manager',
      PROJECT_MANAGER: 'Project Manager',
      PROJECT_MEMBER: 'Project Member',
      TEAM_MEMBER: 'Team Member',
      ROLE_TEAM_MEMBER: 'Team Member',
      CUSTOMER: 'Customer',
      CLIENT: 'Client',
      ROLE_CLIENT: 'Client',
    };
    return map[role] ?? role;
  }

  getStatusClass(status: UserStatus): string {
    const map: Record<UserStatus, string> = {
      ACTIVE: 'badge-active',
      INACTIVE: 'badge-inactive',
      PENDING: 'badge-pending',
      SUSPENDED: 'badge-suspended'
    };
    return map[status] ?? '';
  }

  getInitials(user: User): string {
    if (!user) return 'U';
    const firstName = user.firstName || '';
    const lastName = user.lastName || '';
    if (!firstName && !lastName) return 'U';
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  }

  formatUsage(seconds?: number): string {
    const value = Math.max(0, seconds ?? 0);
    if (value === 0) return '0m';
    if (value < 60) return `${value}s`;

    const minutes = Math.floor(value / 60);
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;

    if (hours === 0) {
      return `${minutes}m`;
    }

    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
  }

  private generateTemporaryPassword(length = 12): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%';
    let value = '';
    for (let i = 0; i < length; i++) {
      value += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return value;
  }
}
