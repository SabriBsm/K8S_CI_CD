import { Injectable, NgZone } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Client, StompSubscription } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { environment } from '../../../environments/environment';
import { Channel, ChannelMessage, WebRtcSignal } from '../models/channel.model';

@Injectable({ providedIn: 'root' })
export class ChannelService {
  private readonly api = environment.ticketApiUrl;
  private stompClient: Client | null = null;
  private msgSubscription: StompSubscription | null = null;
  private signalSubscription: StompSubscription | null = null;
  private pendingSignals: { destination: string; body: string }[] = [];

  constructor(private http: HttpClient, private zone: NgZone) {}

  getChannelByTicket(ticketId: number): Observable<Channel> {
    return this.http.get<Channel>(`${this.api}/channel/byTicket/${ticketId}`);
  }

  getMessages(channelId: number): Observable<ChannelMessage[]> {
    return this.http.get<ChannelMessage[]>(`${this.api}/channel/${channelId}/messages`);
  }

  connect(
    channelId: number,
    onMessage: (msg: ChannelMessage) => void,
    onSignal: (sig: WebRtcSignal) => void
  ): void {
    this.disconnect();

    this.stompClient = new Client({
      webSocketFactory: () => new SockJS(environment.wsUrl),
      reconnectDelay: 5000,
      onConnect: () => {
        this.msgSubscription = this.stompClient!.subscribe(
          `/topic/channels/${channelId}`,
          (frame) => {
            const msg: ChannelMessage = JSON.parse(frame.body);
            this.zone.run(() => onMessage(msg));
          }
        );
        this.signalSubscription = this.stompClient!.subscribe(
          `/topic/channels/${channelId}/signal`,
          (frame) => {
            const sig: WebRtcSignal = JSON.parse(frame.body);
            this.zone.run(() => onSignal(sig));
          }
        );
        const queued = [...this.pendingSignals];
        this.pendingSignals = [];
        queued.forEach(msg => this.stompClient!.publish(msg));
      }
    });

    this.stompClient.activate();
  }

  sendMessage(channelId: number, senderUsername: string, content: string): void {
    if (!this.stompClient?.connected) return;
    this.stompClient.publish({
      destination: `/app/channels/${channelId}/send`,
      body: JSON.stringify({ senderUsername, content })
    });
  }

  sendSignal(channelId: number, signal: WebRtcSignal): void {
    const msg = {
      destination: `/app/channels/${channelId}/signal`,
      body: JSON.stringify(signal)
    };
    if (this.stompClient?.connected) {
      this.stompClient.publish(msg);
    } else if (this.stompClient) {
      this.pendingSignals.push(msg);
    }
  }

  disconnect(): void {
    this.msgSubscription?.unsubscribe();
    this.signalSubscription?.unsubscribe();
    this.msgSubscription = null;
    this.signalSubscription = null;
    this.pendingSignals = [];
    if (this.stompClient?.active) {
      this.stompClient.deactivate();
    }
    this.stompClient = null;
  }
}
