import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DialogModule } from 'primeng/dialog';
import { DividerModule } from 'primeng/divider';
import { DropdownModule } from 'primeng/dropdown';
import { InputTextModule } from 'primeng/inputtext';
import { InputTextareaModule } from 'primeng/inputtextarea';
import { MessagesModule } from 'primeng/messages';
import { ProgressBarModule } from 'primeng/progressbar';
import { RippleModule } from 'primeng/ripple';
import { SkeletonModule } from 'primeng/skeleton';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { QualityStandardFormComponent } from './components/quality-standard-form/quality-standard-form.component';
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
import { QualityRoutingModule } from './quality-routing.module';
import { QualityComponent } from './quality.component';

@NgModule({
  declarations: [
    QualityComponent,
    QualityDashboardPageComponent,
    QualityStandardsPageComponent,
    QualityAuditsPageComponent,
    QualityChecklistItemsPageComponent,
    QualityNonConformitiesPageComponent,
    QualityCorrectiveActionsPageComponent,
    QualityEvidenceScannerPageComponent,
    QualityFaceProfileSetupPageComponent,
    QualityFaceVerificationPageComponent,
    QualityReportsPageComponent,
    QualityStandardFormComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    QualityRoutingModule,
    ProgressBarModule,
    ButtonModule,
    TableModule,
    TagModule,
    SkeletonModule,
    DropdownModule,
    DialogModule,
    InputTextModule,
    InputTextareaModule,
    TooltipModule,
    RippleModule,
    MessagesModule,
    DividerModule,
    ConfirmDialogModule
  ]
})
export class QualityModule {}
