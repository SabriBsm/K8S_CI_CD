import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { MainLayoutComponent } from './layout/main-layout/main-layout.component';
import { authGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';
import { UserProfileComponent } from './features/users/user-profile/user-profile.component';

const routes: Routes = [
 {
  path: 'public/checklist/:id',
  loadComponent: () => import('./features/risks/crisis-checklist.component')
    .then(m => m.CrisisChecklistComponent)
},
  {
    path: 'auth',
    loadChildren: () => import('./features/auth/auth.module').then(m => m.AuthModule)
  },
  {
    path: '',
    component: MainLayoutComponent,
    canActivate: [authGuard],
    children: [
      {
        path: 'dashboard',
        loadChildren: () => import('./features/dashboard/dashboard.module').then(m => m.DashboardModule)
      },
      {
        path: 'admin',
        loadChildren: () => import('./features/admin/admin.module').then(m => m.AdminModule),
        canActivate: [roleGuard],
        data: { roles: ['ADMIN'] }
      },
      {
        path: 'settings',
        component: UserProfileComponent
      },
      {
        path: 'users',
        loadChildren: () => import('./features/users/users.module').then(m => m.UsersModule),
        canActivate: [roleGuard],
        data: { roles: ['ADMIN', 'PROJECT_MANAGER'] }
      },
      {
        path: 'projects',
        loadChildren: () => import('./features/projects/projects.module').then(m => m.ProjectsModule)
      },
      {
        path: 'tasks',
        loadChildren: () => import('./features/tasks/tasks.module').then(m => m.TasksModule)
      },
      {
        path: 'kanban',
        loadChildren: () => import('./features/kanban/kanban.module').then(m => m.KanbanModule)
      },
      {
        path: 'finance',
        loadChildren: () => import('./features/finance/finance.module').then(m => m.FinanceModule)
      },
      {
        path: 'risks',
        loadChildren: () => import('./features/risks/risks.module').then(m => m.RisksModule)
      },
      {
        path: 'quality',
        loadChildren: () => import('./features/quality/quality.module').then(m => m.QualityModule)
      },
      {
        path: 'tickets',
        loadChildren: () => import('./features/tickets/tickets.module').then(m => m.TicketsModule)
      },
      {
        path: 'analytics',
        loadChildren: () => import('./features/analytics/analytics.module').then(m => m.AnalyticsModule)
      },
      {
        path: 'notifications',
        loadChildren: () => import('./features/notifications/notifications.module').then(m => m.NotificationsModule)
      },
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' }
    ]
  },
  { path: '**', redirectTo: 'dashboard' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule {}
