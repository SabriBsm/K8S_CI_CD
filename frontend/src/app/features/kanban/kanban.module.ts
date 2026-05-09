import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { KanbanRoutingModule } from './kanban-routing.module';
import { KanbanComponent } from './kanban.component';
import { ProgressBarModule } from 'primeng/progressbar';
import { ButtonModule } from 'primeng/button';

@NgModule({
  declarations: [KanbanComponent],
  imports: [
    CommonModule,
    KanbanRoutingModule,
    ProgressBarModule,
    ButtonModule
  ]
})
export class KanbanModule {}
