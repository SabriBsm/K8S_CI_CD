export type ChannelStatus = 'ACTIVE' | 'ARCHIVED';

export interface Channel {
  id: number;
  name: string;
  status: ChannelStatus;
  members: string;
  createdAt?: string;
}

export interface ChannelMessage {
  id?: number;
  content: string;
  senderUsername: string;
  sentAt?: string;
}

export interface WebRtcSignal {
  type: 'join' | 'offer' | 'answer' | 'ice' | 'leave';
  from: string;
  to?: string;
  payload?: any;
}
