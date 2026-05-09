import {
  Component, Input, OnDestroy, ViewChild, ElementRef,
  NgZone, ChangeDetectorRef
} from '@angular/core';
import { WebrtcService } from '../../../core/services/webrtc.service';
import { ChannelService } from '../../../core/services/channel.service';
import { WebRtcSignal } from '../../../core/models/channel.model';

@Component({
  selector: 'app-voice-panel',
  templateUrl: './voice-panel.component.html',
  styleUrls: ['./voice-panel.component.scss']
})
export class VoicePanelComponent implements OnDestroy {
  @Input() channelId!: number;
  @Input() currentUser!: string;

  @ViewChild('remoteAudio') remoteAudioRef!: ElementRef<HTMLAudioElement>;

  inCall      = false;
  isMuted     = false;
  isConnected = false;
  remoteUsers: string[] = [];
  statusMsg   = '';
  error       = '';

  localSpeaking  = false;
  remoteSpeaking = false;
  localLevel     = 0;
  remoteLevel    = 0;

  private isInitiator    = false;
  private audioCtx?: AudioContext;
  private localAnalyser?: AnalyserNode;
  private remoteAnalyser?: AnalyserNode;
  private animFrame?: number;
  private levelBuf?: Uint8Array;

  constructor(
    private webrtcService: WebrtcService,
    private channelService: ChannelService,
    private zone: NgZone,
    private cdr: ChangeDetectorRef
  ) {}

  async joinVoice(): Promise<void> {
    this.error       = '';
    this.statusMsg   = 'Connexion au micro…';
    this.isConnected = false;

    try {
      await this.webrtcService.startCall(
        (stream) => this.onRemoteStream(stream),
        (candidate) => this.onLocalIce(candidate)
      );

      const local = this.webrtcService.getLocalStream();
      if (local) this.startLocalMonitor(local);

      this.inCall    = true;
      this.statusMsg = 'En attente d\'un autre participant…';

      this.channelService.sendSignal(this.channelId, { type: 'join', from: this.currentUser });

    } catch {
      this.error     = 'Impossible d\'accéder au micro. Autorisez le micro dans votre navigateur.';
      this.statusMsg = '';
    }
  }

  async handleSignal(sig: WebRtcSignal): Promise<void> {
    if (!this.inCall && sig.type !== 'join') return;

    switch (sig.type) {
      case 'join':
        if (sig.from === this.currentUser) break;
        if (!this.remoteUsers.includes(sig.from)) {
          this.remoteUsers = [...this.remoteUsers, sig.from];
        }
        if (this.inCall) {
          const shouldInitiate = this.currentUser < sig.from;
          if (shouldInitiate && !this.isInitiator) {
            this.isInitiator = true;
            this.statusMsg = `${sig.from} a rejoint — connexion en cours…`;
            try {
              const offer = await this.webrtcService.createOffer();
              this.channelService.sendSignal(this.channelId, {
                type: 'offer', from: this.currentUser, to: sig.from, payload: offer
              });
            } catch {}
          }
        }
        break;

      case 'offer':
        if (sig.from === this.currentUser) break;
        if (sig.to && sig.to !== this.currentUser) break;
        if (!this.remoteUsers.includes(sig.from)) {
          this.remoteUsers = [...this.remoteUsers, sig.from];
        }
        this.statusMsg = `Connexion avec ${sig.from}…`;
        try {
          const answer = await this.webrtcService.handleOffer(sig.payload);
          this.channelService.sendSignal(this.channelId, {
            type: 'answer', from: this.currentUser, to: sig.from, payload: answer
          });
        } catch {}
        break;

      case 'answer':
        if (sig.from === this.currentUser) break;
        if (sig.to && sig.to !== this.currentUser) break;
        try {
          await this.webrtcService.handleAnswer(sig.payload);
          this.isConnected = true;
          this.statusMsg   = '';
        } catch {}
        break;

      case 'ice':
        if (sig.from === this.currentUser) break;
        if (sig.to && sig.to !== this.currentUser) break;
        try {
          await this.webrtcService.addIceCandidate(sig.payload);
        } catch {}
        break;

      case 'leave':
        if (sig.from === this.currentUser) break;
        this.remoteUsers    = this.remoteUsers.filter(u => u !== sig.from);
        this.isConnected    = false;
        this.remoteSpeaking = false;
        this.remoteLevel    = 0;
        this.statusMsg      = `${sig.from} a quitté le canal vocal`;
        break;
    }
  }

  private onRemoteStream(stream: MediaStream): void {
    const audio = this.remoteAudioRef?.nativeElement;
    if (audio) {
      audio.srcObject = stream;
      setTimeout(() => this.startRemoteMonitor(stream), 300);
    }
    this.zone.run(() => {
      this.isConnected = true;
      this.statusMsg   = '';
    });
  }

  private onLocalIce(candidate: RTCIceCandidate): void {
    this.channelService.sendSignal(this.channelId, {
      type: 'ice', from: this.currentUser, payload: candidate.toJSON()
    });
  }

  private startLocalMonitor(stream: MediaStream): void {
    try {
      this.audioCtx      = new AudioContext();
      const src          = this.audioCtx.createMediaStreamSource(stream);
      this.localAnalyser = this.audioCtx.createAnalyser();
      this.localAnalyser.fftSize = 256;
      this.localAnalyser.smoothingTimeConstant = 0.8;
      src.connect(this.localAnalyser);
      this.levelBuf = new Uint8Array(this.localAnalyser.fftSize);
      this.runLevelLoop();
    } catch {}
  }

  private startRemoteMonitor(stream: MediaStream): void {
    if (!this.audioCtx) return;
    try {
      const src           = this.audioCtx.createMediaStreamSource(stream);
      this.remoteAnalyser = this.audioCtx.createAnalyser();
      this.remoteAnalyser.fftSize = 256;
      this.remoteAnalyser.smoothingTimeConstant = 0.8;
      src.connect(this.remoteAnalyser);
    } catch {}
  }

  private runLevelLoop(): void {
    const tick = () => {
      if (!this.levelBuf) return;
      if (this.localAnalyser && !this.isMuted) {
        this.localAnalyser.getByteTimeDomainData(this.levelBuf);
        const rms       = this.getRms(this.levelBuf);
        this.localLevel = Math.min(rms * 8, 1);
        this.localSpeaking = rms > 0.015;
      } else {
        this.localLevel    = 0;
        this.localSpeaking = false;
      }
      if (this.remoteAnalyser) {
        this.remoteAnalyser.getByteTimeDomainData(this.levelBuf);
        const rms         = this.getRms(this.levelBuf);
        this.remoteLevel  = Math.min(rms * 8, 1);
        this.remoteSpeaking = rms > 0.015;
      }
      this.animFrame = requestAnimationFrame(tick);
    };
    this.animFrame = requestAnimationFrame(tick);
  }

  private getRms(buf: Uint8Array): number {
    let sum = 0;
    for (const v of buf) {
      const n = (v - 128) / 128;
      sum += n * n;
    }
    return Math.sqrt(sum / buf.length);
  }

  private stopLevelMonitor(): void {
    if (this.animFrame) cancelAnimationFrame(this.animFrame);
    this.audioCtx?.close().catch(() => {});
    this.audioCtx       = undefined;
    this.localAnalyser  = undefined;
    this.remoteAnalyser = undefined;
    this.levelBuf       = undefined;
  }

  initials(username: string): string {
    return username.split('@')[0].slice(0, 2).toUpperCase();
  }

  toggleMute(): void {
    this.isMuted = !this.isMuted;
    this.webrtcService.toggleMute(this.isMuted);
    if (this.isMuted) { this.localSpeaking = false; this.localLevel = 0; }
  }

  hangup(): void {
    this.channelService.sendSignal(this.channelId, { type: 'leave', from: this.currentUser });
    this.stopLevelMonitor();
    this.webrtcService.hangup();
    const audio = this.remoteAudioRef?.nativeElement;
    if (audio) audio.srcObject = null;
    this.inCall         = false;
    this.isMuted        = false;
    this.isConnected    = false;
    this.isInitiator    = false;
    this.remoteUsers    = [];
    this.statusMsg      = '';
    this.localSpeaking  = false;
    this.remoteSpeaking = false;
    this.localLevel     = 0;
    this.remoteLevel    = 0;
  }

  ngOnDestroy(): void {
    if (this.inCall) this.hangup();
    this.stopLevelMonitor();
  }
}
