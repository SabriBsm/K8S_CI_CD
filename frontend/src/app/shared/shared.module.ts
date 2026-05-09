import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PageHeaderComponent } from './components/page-header/page-header.component';
import { StatCardComponent } from './components/stat-card/stat-card.component';
import { EmptyStateComponent } from './components/empty-state/empty-state.component';
import { RoleLabelPipe } from './pipes/role-label.pipe';



@NgModule({
  declarations: [
    PageHeaderComponent,
    StatCardComponent,
    EmptyStateComponent,
    RoleLabelPipe
  ],
  imports: [
    CommonModule
  ],
  exports: [
    PageHeaderComponent,
    StatCardComponent,
    EmptyStateComponent,
    RoleLabelPipe
  ]
})
export class SharedModule { }
