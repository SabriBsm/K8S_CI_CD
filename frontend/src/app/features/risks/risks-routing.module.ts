import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { RisksComponent } from './risks.component';
import { RiskDetailsComponent } from './index';
import { RiskStatisticsComponent } from './risk-statistics.component';
import { CrisisChecklistComponent } from './crisis-checklist.component';

const routes: Routes = [
  { path: 'statistics', component: RiskStatisticsComponent },
  { path: 'checklist', component: CrisisChecklistComponent },
  { path: ':id', component: RiskDetailsComponent },
  { path: '', component: RisksComponent, pathMatch: 'full' }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class RisksRoutingModule {}
