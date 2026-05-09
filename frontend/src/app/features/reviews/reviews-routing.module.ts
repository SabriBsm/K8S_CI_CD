import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ManagerReviewsComponent } from './manager-reviews.component';

const routes: Routes = [
  {
    path: '',
    component: ManagerReviewsComponent
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class ReviewsRoutingModule {}
