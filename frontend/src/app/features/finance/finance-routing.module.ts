import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { FinanceComponent } from './finance.component';
import { FinanceDashboardComponent } from './finance-dashboard/finance-dashboard.component';

const routes: Routes = [
  { path: '', component: FinanceDashboardComponent },
  { path: 'manage', component: FinanceComponent }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class FinanceRoutingModule {}
