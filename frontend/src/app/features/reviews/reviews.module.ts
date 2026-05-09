import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { ManagerReviewsComponent } from './manager-reviews.component';
import { ReviewsRoutingModule } from './reviews-routing.module';
import { SafeUrlPipe } from './safe-url.pipe';

@NgModule({
  declarations: [
    ManagerReviewsComponent,
    SafeUrlPipe
  ],
  imports: [
    CommonModule,
    ReviewsRoutingModule,
    ButtonModule,
    ProgressSpinnerModule
  ]
})
export class ReviewsModule {}
