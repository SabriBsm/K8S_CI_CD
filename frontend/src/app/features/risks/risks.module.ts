import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RisksRoutingModule } from './risks-routing.module';
import { RisksComponent } from './risks.component';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { InputTextModule } from 'primeng/inputtext';
import { DialogModule } from 'primeng/dialog';
import { DropdownModule } from 'primeng/dropdown';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextareaModule } from 'primeng/inputtextarea';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { TooltipModule } from 'primeng/tooltip';
import { ChartModule } from 'primeng/chart';
import { PaginatorModule } from 'primeng/paginator';
import { RiskStatisticsComponent } from './risk-statistics.component';

@NgModule({
  declarations: [RisksComponent, RiskStatisticsComponent],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RisksRoutingModule,
    ButtonModule,
    TableModule,
    InputTextModule,
    DialogModule,
    DropdownModule,
    InputNumberModule,
    InputTextareaModule,
    ConfirmDialogModule,
    TooltipModule,
    ChartModule,
    PaginatorModule
  ]
})
export class RisksModule {}
