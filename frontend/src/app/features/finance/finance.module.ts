import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FinanceRoutingModule } from './finance-routing.module';
import { FinanceComponent } from './finance.component';
import { FinanceDashboardComponent } from './finance-dashboard/finance-dashboard.component';
import { ProgressBarModule } from 'primeng/progressbar';
import { ButtonModule } from 'primeng/button';
import { ChartModule } from 'primeng/chart';

@NgModule({
  declarations: [FinanceComponent, FinanceDashboardComponent],
  imports: [
    CommonModule,
    FormsModule,
    FinanceRoutingModule,
    ProgressBarModule,
    ButtonModule,
    ChartModule
  ]
})
export class FinanceModule {}
