import { Component, OnInit } from '@angular/core';
import { MenuItem } from 'primeng/api';
import { AuthService } from '../../core/services/auth.service';
import { AuthUser } from '../../core/models/auth.model';

@Component({
  selector: 'app-admin',
  templateUrl: './admin.component.html',
  styleUrl: './admin.component.scss'
})
export class AdminComponent implements OnInit {
  currentUser: AuthUser | null = null;
  tabs: MenuItem[] = [];

  constructor(private authService: AuthService) {}

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();
    this.tabs = [
      { label: 'Dashboard', icon: 'pi pi-chart-bar', routerLink: ['/admin/dashboard'] },
      { label: 'Users', icon: 'pi pi-users', routerLink: ['/admin/users'] }
    ];
  }

  getDisplayName(): string {
    if (!this.currentUser) return 'Administrator';
    return `${this.currentUser.firstName || ''} ${this.currentUser.lastName || ''}`.trim() || 'Administrator';
  }
}

