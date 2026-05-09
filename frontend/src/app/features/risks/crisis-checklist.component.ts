import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';

interface CrisisChecklistStep {
  key: string;
  label: string;
  done: boolean;
}

@Component({
  selector: 'app-crisis-checklist',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './crisis-checklist.component.html',
  styleUrl: './crisis-checklist.component.scss'
})
export class CrisisChecklistComponent implements OnInit {
  riskTitle = '';
  mitigationAction = '';
  mitigationStatus = '';
  priority = '';
  dueDate = '';

  steps: CrisisChecklistStep[] = [
    { key: 'backup', label: 'Backup/snapshot executed and verified', done: false },
    { key: 'notify', label: 'Incident team notified and owner confirmed', done: false },
    { key: 'rollback', label: 'Rollback and containment steps validated', done: false },
    { key: 'status', label: 'Mitigation status updated in PlanSync', done: false }
  ];

  constructor(private route: ActivatedRoute) {}

  ngOnInit(): void {
    this.route.queryParamMap.subscribe(params => {
      this.riskTitle = params.get('riskTitle') ?? '';
      this.mitigationAction = params.get('mitigationAction') ?? '';
      this.mitigationStatus = params.get('mitigationStatus') ?? '';
      this.priority = params.get('priority') ?? '';
      this.dueDate = params.get('dueDate') ?? '';
    });
  }

  get completedSteps(): number {
    return this.steps.filter(step => step.done).length;
  }

  get completionRatio(): number {
    if (!this.steps.length) return 0;
    return Math.round((this.completedSteps / this.steps.length) * 100);
  }
}
