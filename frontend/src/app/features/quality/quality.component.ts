import { Component } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';

@Component({
  selector: 'app-quality',
  templateUrl: './quality.component.html',
  styleUrl: './quality.component.scss'
})
export class QualityComponent {
  readonly navItems = [
    { label: 'Dashboard', icon: 'pi pi-chart-line', route: '/quality/dashboard' },
    { label: 'Standards', icon: 'pi pi-book', route: '/quality/standards' },
    { label: 'Audits', icon: 'pi pi-verified', route: '/quality/audits' },
    { label: 'Checklist Items', icon: 'pi pi-list', route: '/quality/checklist-items' },
    { label: 'Non-Conformities', icon: 'pi pi-exclamation-circle', route: '/quality/non-conformities' },
    { label: 'Corrective Actions', icon: 'pi pi-wrench', route: '/quality/corrective-actions' },
    { label: 'Evidence Scanner', icon: 'pi pi-file-check', route: '/quality/evidence-scanner' },
    { label: 'Face Profile Setup', icon: 'pi pi-user-edit', route: '/quality/face-profile-setup' },
    { label: 'Audit Verification', icon: 'pi pi-camera', route: '/quality/audit-verification' },
    { label: 'Reports', icon: 'pi pi-file-pdf', route: '/quality/reports' }
  ];

  activeRoute = '';

  constructor(private router: Router) {
    this.activeRoute = this.router.url;
    this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe(event => {
        this.activeRoute = event.urlAfterRedirects;
      });
  }

  isActive(route: string): boolean {
    return this.activeRoute.startsWith(route);
  }
}
