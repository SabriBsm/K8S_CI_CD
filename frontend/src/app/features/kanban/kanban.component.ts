import { Component } from '@angular/core';

@Component({
  selector: 'app-kanban',
  templateUrl: './kanban.component.html',
  styleUrl: './kanban.component.scss'
})
export class KanbanComponent {
  icon     = 'pi pi-th-large';
  title    = 'Kanban Board';
  desc     = 'Visual drag-and-drop Kanban boards with labels, swimlanes, and dependency management.';
  progress = 55;
}
