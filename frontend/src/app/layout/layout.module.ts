import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MainLayoutComponent } from './main-layout/main-layout.component';
import { SidebarComponent } from './sidebar/sidebar.component';
import { TopbarComponent } from './topbar/topbar.component';

// PrimeNG
import { ButtonModule } from 'primeng/button';
import { BadgeModule } from 'primeng/badge';
import { OverlayPanelModule } from 'primeng/overlaypanel';
import { MenuModule } from 'primeng/menu';
import { AvatarModule } from 'primeng/avatar';
import { RippleModule } from 'primeng/ripple';
import { TooltipModule } from 'primeng/tooltip';
import { InputTextModule } from 'primeng/inputtext';

@NgModule({
  declarations: [
    MainLayoutComponent,
    SidebarComponent,
    TopbarComponent
  ],
  imports: [
    RouterModule,
    CommonModule,
    ButtonModule,
    BadgeModule,
    MenuModule,
    AvatarModule,
    RippleModule,
    TooltipModule,
    InputTextModule,
    OverlayPanelModule
  ],
  exports: [
    MainLayoutComponent,
    SidebarComponent,
    TopbarComponent
  ]
})
export class LayoutModule {}
