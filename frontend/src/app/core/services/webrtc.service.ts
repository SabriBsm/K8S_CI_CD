import { Injectable } from '@angular/core';

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' }
  ]
};

@Injectable({ providedIn: 'root' })
export class WebrtcService {
  private pc: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private pendingCandidates: RTCIceCandidateInit[] = [];

  async startCall(
    onRemoteStream: (stream: MediaStream) => void,
    onIceCandidate: (candidate: RTCIceCandidate) => void
  ): Promise<void> {
    this.hangup();

    this.localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    this.pc = new RTCPeerConnection(ICE_SERVERS);

    this.localStream.getTracks().forEach(track => this.pc!.addTrack(track, this.localStream!));

    this.pc.ontrack = (event) => {
      if (event.streams?.[0]) onRemoteStream(event.streams[0]);
    };

    this.pc.onicecandidate = (event) => {
      if (event.candidate) onIceCandidate(event.candidate);
    };
  }

  async createOffer(): Promise<RTCSessionDescriptionInit> {
    const offer = await this.pc!.createOffer();
    await this.pc!.setLocalDescription(offer);
    return offer;
  }

  async handleOffer(sdp: RTCSessionDescriptionInit): Promise<RTCSessionDescriptionInit> {
    await this.pc!.setRemoteDescription(new RTCSessionDescription(sdp));
    await this.flushPendingCandidates();
    const answer = await this.pc!.createAnswer();
    await this.pc!.setLocalDescription(answer);
    return answer;
  }

  async handleAnswer(sdp: RTCSessionDescriptionInit): Promise<void> {
    await this.pc!.setRemoteDescription(new RTCSessionDescription(sdp));
    await this.flushPendingCandidates();
  }

  async addIceCandidate(candidate: RTCIceCandidateInit): Promise<void> {
    if (this.pc?.remoteDescription) {
      await this.pc.addIceCandidate(new RTCIceCandidate(candidate));
    } else {
      this.pendingCandidates.push(candidate);
    }
  }

  private async flushPendingCandidates(): Promise<void> {
    const queued = [...this.pendingCandidates];
    this.pendingCandidates = [];
    for (const c of queued) {
      try { await this.pc!.addIceCandidate(new RTCIceCandidate(c)); } catch {}
    }
  }

  toggleMute(muted: boolean): void {
    this.localStream?.getAudioTracks().forEach(t => (t.enabled = !muted));
  }

  getLocalStream(): MediaStream | null {
    return this.localStream;
  }

  hangup(): void {
    this.localStream?.getTracks().forEach(t => t.stop());
    this.pc?.close();
    this.localStream = null;
    this.pc = null;
    this.pendingCandidates = [];
  }

  get isActive(): boolean {
    return this.pc !== null;
  }
}
