import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { MessageService, ConfirmationService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { jwtInterceptor } from './core/interceptors/jwt.interceptor';
import { authRefreshInterceptor } from './core/interceptors/auth-refresh.interceptor';
import { errorInterceptor } from './core/interceptors/error.interceptor';
import { LayoutModule } from './layout/layout.module';
import { BadgeModule } from 'primeng/badge';
@NgModule({
  declarations: [AppComponent],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    AppRoutingModule,
    LayoutModule,
    ToastModule,
    ConfirmDialogModule,
    BadgeModule
  ],
  providers: [
    MessageService,
    ConfirmationService,
    // Order matters: add JWT -> try refresh on 401 -> then generic error handler
    provideHttpClient(withInterceptors([jwtInterceptor, authRefreshInterceptor, errorInterceptor]))
  ],
  bootstrap: [AppComponent]
})
export class AppModule {}
