import {
  Component, Input, OnInit, OnDestroy, OnChanges,
  SimpleChanges, ViewChild, ElementRef, AfterViewChecked
} from '@angular/core';
import { ChannelService } from '../../../core/services/channel.service';
import { Channel, ChannelMessage, WebRtcSignal } from '../../../core/models/channel.model';

@Component({
  selector: 'app-channel-panel',
  templateUrl: './channel-panel.component.html',
  styleUrls: ['./channel-panel.component.scss']
})
export class ChannelPanelComponent implements OnInit, OnChanges, OnDestroy, AfterViewChecked {
  @Input() ticketId!: number;
  @Input() currentUser!: string;
  @Input() onSignal!: (sig: WebRtcSignal) => void;

  @ViewChild('msgContainer') msgContainer!: ElementRef;

  channel: Channel | null = null;
  messages: ChannelMessage[] = [];
  inputText = '';
  loading = true;
  error = '';
  private shouldScroll = false;

  constructor(private channelService: ChannelService) {}

  ngOnInit(): void {
    this.initChannel();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['ticketId'] && !changes['ticketId'].firstChange) {
      this.channelService.disconnect();
      this.initChannel();
    }
  }

  private initChannel(): void {
    if (!this.ticketId) return;
    this.loading = true;
    this.messages = [];
    this.channel = null;

    this.channelService.getChannelByTicket(this.ticketId).subscribe({
      next: (ch) => {
        this.channel = ch;
        this.channelService.getMessages(ch.id).subscribe({
          next: (msgs) => {
            this.messages = msgs;
            this.shouldScroll = true;
            this.loading = false;
          },
          error: () => { this.loading = false; }
        });
        this.channelService.connect(
          ch.id,
          (msg) => { this.messages.push(msg); this.shouldScroll = true; },
          (sig) => { if (this.onSignal) this.onSignal(sig); }
        );
      },
      error: () => {
        this.error = 'Impossible de charger le channel.';
        this.loading = false;
      }
    });
  }

  ngAfterViewChecked(): void {
    if (this.shouldScroll) {
      this.scrollToBottom();
      this.shouldScroll = false;
    }
  }

  private scrollToBottom(): void {
    try {
      const el = this.msgContainer?.nativeElement;
      if (el) el.scrollTop = el.scrollHeight;
    } catch {}
  }

  sendMessage(): void {
    const text = this.inputText.trim();
    if (!text || !this.channel) return;
    this.channelService.sendMessage(this.channel.id, this.currentUser, text);
    this.inputText = '';
  }

  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  isOwn(msg: ChannelMessage): boolean {
    return msg.senderUsername === this.currentUser;
  }

  initials(username: string): string {
    return username.split('@')[0].slice(0, 2).toUpperCase();
  }

  get isArchived(): boolean {
    return this.channel?.status === 'ARCHIVED';
  }

  ngOnDestroy(): void {
    this.channelService.disconnect();
  }
}
