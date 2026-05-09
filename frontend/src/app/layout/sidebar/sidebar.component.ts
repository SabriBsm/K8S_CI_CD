import { Component, Input, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { AuthUser, UserRole } from '../../core/models/auth.model';

interface NavItem {
  label: string;
  icon: string;
  route: string;
  badge?: number;
  roles?: UserRole[];
}

interface NavGroup {
  title?: string;
  items: NavItem[];
}

interface SocialLink {
  label: string;
  url: string;
  icon: string;
}

@Component({
  selector: 'app-sidebar',
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.scss'
})
export class SidebarComponent implements OnInit {
  @Input() collapsed = false;

  currentUser: AuthUser | null = null;
  readonly companyName = 'PlanSync Pro';
  readonly companyTagline = '';
  readonly companyAddress = 'Lac 1, Tunis, Tunisia';
  readonly companyEmail = 'info@plansyncpro.com';
  readonly companyPhone = '+216 71 000 000';

  readonly socialLinks: SocialLink[] = [
    { label: 'LinkedIn', url: 'https://www.linkedin.com', icon: 'pi pi-link' },
    { label: 'X / Twitter', url: 'https://x.com', icon: 'pi pi-share-alt' },
    { label: 'GitHub', url: 'https://github.com', icon: 'pi pi-github' }
  ];

  navGroups: NavGroup[] = [
    {
      title: 'ADMINISTRATION',
      items: [
        { label: 'Admin Panel', icon: 'pi pi-shield', route: '/admin/dashboard', roles: ['ADMIN'] }
      ]
    },
    {
      items: [
        { label: 'Dashboard', icon: 'pi pi-home', route: '/dashboard', roles: ['ADMIN', 'PROJECT_MANAGER', 'PROJECT_MEMBER', 'CUSTOMER'] }
      ]
    },
    {
      title: 'PROJECT MANAGEMENT',
      items: [
        { label: 'Projects', icon: 'pi pi-briefcase', route: '/projects', roles: ['ADMIN', 'PROJECT_MANAGER', 'PROJECT_MEMBER', 'CUSTOMER'] },
        { label: 'Tasks', icon: 'pi pi-check-square', route: '/tasks', roles: ['ADMIN', 'PROJECT_MANAGER', 'PROJECT_MEMBER'] },
        { label: 'Finance', icon: 'pi pi-dollar', route: '/finance', roles: ['ADMIN', 'PROJECT_MANAGER'] },
        { label: 'Risk Management', icon: 'pi pi-exclamation-triangle', route: '/risks', roles: ['ADMIN', 'PROJECT_MANAGER', 'PROJECT_MEMBER'] },
        { label: 'Quality', icon: 'pi pi-shield', route: '/quality', roles: ['ADMIN', 'PROJECT_MANAGER'] }
      ]
    },
    /*{
      title: 'MONITORING',
      items: [
        { label: 'Finance', icon: 'pi pi-dollar', route: '/finance' },
        { label: 'Risk Management', icon: 'pi pi-exclamation-triangle', route: '/risks' },
        { label: 'Quality', icon: 'pi pi-shield', route: '/quality' }
      ]
    },*/
    {
      title: 'SUPPORT',
      items: [
        //{ label: 'Notifications', icon: 'pi pi-bell', route: '/notifications' },
        { label: 'Tickets', icon: 'pi pi-ticket', route: '/tickets', roles: ['ADMIN', 'PROJECT_MANAGER', 'PROJECT_MEMBER'] },
       // { label: 'Analytics', icon: 'pi pi-chart-bar', route: '/analytics' }
      ]
    },
    {
      title: 'ACCOUNT',
      items: [
        { label: 'Settings', icon: 'pi pi-cog', route: '/settings', roles: ['ADMIN', 'PROJECT_MANAGER', 'PROJECT_MEMBER'] }
      ]
    }
  ];

  constructor(
    public router: Router,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.authService.currentUser$.subscribe(user => {
      this.currentUser = user;
    });
  }

  isActive(route: string): boolean {
    return this.router.url.startsWith(route);
  }

  hasVisibleItems(group: NavGroup): boolean {
    return group.items.some(item => this.canDisplayItem(item));
  }

  canDisplayItem(item: NavItem): boolean {
    if (!item.roles || item.roles.length === 0) {
      return true;
    }
    const currentRole = this.currentUser?.role;
    return !!currentRole && item.roles.includes(currentRole);
  }


  getPhoneHref(): string {
    return `tel:${this.companyPhone.replace(/\s+/g, '')}`;
  }
}
