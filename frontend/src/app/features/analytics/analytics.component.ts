import { Component } from '@angular/core';

@Component({
  selector: 'app-analytics',
  templateUrl: './analytics.component.html',
  styleUrl: './analytics.component.scss'
})
export class AnalyticsComponent {
  icon     = 'pi pi-chart-bar';
  title    = 'Advanced Analytics';
  desc     = 'Real-time KPI dashboards, predictive scheduling, and AI-driven project health insights.';
  progress = 35;
}
