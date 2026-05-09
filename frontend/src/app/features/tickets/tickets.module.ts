import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TicketsRoutingModule } from './tickets-routing.module';
import { TicketsComponent } from './tickets.component';
import { ChannelPanelComponent } from '../channels/channel-panel/channel-panel.component';
import { VoicePanelComponent }   from '../channels/voice-panel/voice-panel.component';

// PrimeNG
import { TableModule }         from 'primeng/table';
import { DialogModule }        from 'primeng/dialog';
import { ButtonModule }        from 'primeng/button';
import { InputTextModule }     from 'primeng/inputtext';
import { InputTextareaModule } from 'primeng/inputtextarea';
import { DropdownModule }      from 'primeng/dropdown';
import { TagModule }           from 'primeng/tag';
import { CalendarModule }      from 'primeng/calendar';
import { DividerModule }       from 'primeng/divider';
import { TooltipModule }       from 'primeng/tooltip';
import { ConfirmDialogModule } from 'primeng/confirmdialog';

@NgModule({
  declarations: [TicketsComponent, ChannelPanelComponent, VoicePanelComponent],
  imports: [
    CommonModule,
    FormsModule,
    TicketsRoutingModule,
    TableModule,
    DialogModule,
    ButtonModule,
    InputTextModule,
    InputTextareaModule,
    DropdownModule,
    TagModule,
    CalendarModule,
    DividerModule,
    TooltipModule,
    ConfirmDialogModule
  ]
})
export class TicketsModule {}
