import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { QualityComponent } from './quality.component';
import { QualityAuditsPageComponent } from './pages/quality-audits-page/quality-audits-page.component';
import { QualityChecklistItemsPageComponent } from './pages/quality-checklist-items-page/quality-checklist-items-page.component';
import { QualityCorrectiveActionsPageComponent } from './pages/quality-corrective-actions-page/quality-corrective-actions-page.component';
import { QualityDashboardPageComponent } from './pages/quality-dashboard-page/quality-dashboard-page.component';
import { QualityEvidenceScannerPageComponent } from './pages/quality-evidence-scanner-page/quality-evidence-scanner-page.component';
import { QualityFaceProfileSetupPageComponent } from './pages/quality-face-profile-setup-page/quality-face-profile-setup-page.component';
import { QualityFaceVerificationPageComponent } from './pages/quality-face-verification-page/quality-face-verification-page.component';
import { QualityNonConformitiesPageComponent } from './pages/quality-non-conformities-page/quality-non-conformities-page.component';
import { QualityReportsPageComponent } from './pages/quality-reports-page/quality-reports-page.component';
import { QualityStandardsPageComponent } from './pages/quality-standards-page/quality-standards-page.component';

const routes: Routes = [
  {
    path: '',
    component: QualityComponent,
    children: [
      { path: 'dashboard', component: QualityDashboardPageComponent },
      { path: 'standards', component: QualityStandardsPageComponent },
      { path: 'audits', component: QualityAuditsPageComponent },
      { path: 'checklist-items', component: QualityChecklistItemsPageComponent },
      { path: 'non-conformities', component: QualityNonConformitiesPageComponent },
      { path: 'corrective-actions', component: QualityCorrectiveActionsPageComponent },
      { path: 'evidence-scanner', component: QualityEvidenceScannerPageComponent },
      { path: 'face-profile-setup', component: QualityFaceProfileSetupPageComponent },
      { path: 'face-verification', component: QualityFaceVerificationPageComponent },
      { path: 'audit-verification', component: QualityFaceVerificationPageComponent },
      { path: 'reports', component: QualityReportsPageComponent },
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class QualityRoutingModule {}
