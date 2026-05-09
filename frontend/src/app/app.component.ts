import { Component, OnDestroy, OnInit } from '@angular/core';
import { IdleTimeoutService } from './core/services/idle-timeout.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent implements OnInit, OnDestroy {
  constructor(private idle: IdleTimeoutService) {}

  ngOnInit(): void {
    this.idle.start();
  }

  ngOnDestroy(): void {
    this.idle.stop();
  }
}
