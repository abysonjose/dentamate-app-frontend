import { Injectable, OnDestroy } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';
import { io, Socket } from 'socket.io-client';
import { AuthService } from './auth.service';

export interface StaffMember {
  id: string;
  userId: string;
  name: string;
  role: string;
  avatarUrl?: string;
  initials: string;
  online: boolean;
  unread: number;
  lastMessage?: string;
  lastTime?: string;
}

export type AttachmentType = 'image' | 'document' | 'video';

export interface MessageAttachment {
  type: AttachmentType;
  name: string;
  url: string;
  size?: string;
}

export interface MeetingSchedule {
  id: string;
  title: string;
  scheduledAt: Date;
  hostId: string;
  hostName: string;
  participants: string[];
  status: 'scheduled' | 'live' | 'ended';
}

export interface ChatMessage {
  id: string;
  contactId: string;
  text: string;
  time: string;
  fromMe: boolean;
  attachment?: MessageAttachment;
  meeting?: MeetingSchedule;
}

const API = 'http://localhost:5000/api';
const SOCKET_URL = 'http://localhost:5000';

@Injectable({ providedIn: 'root' })
export class StaffChatService implements OnDestroy {

  private socket!: Socket;
  private _incomingMessage$ = new BehaviorSubject<any>(null);
  private _presenceUpdate$  = new BehaviorSubject<{ userId: string; online: boolean } | null>(null);
  private _meetings         = new BehaviorSubject<MeetingSchedule[]>([]);

  incomingMessage$ = this._incomingMessage$.asObservable();
  presenceUpdate$  = this._presenceUpdate$.asObservable();
  meetings$        = this._meetings.asObservable();

  constructor(private http: HttpClient, private auth: AuthService) {
    this._connect();
  }

  // ── Socket Connection ─────────────────────────────────────────────────────

  private _connect(): void {
    this.socket = io(SOCKET_URL, { transports: ['websocket'] });

    this.socket.on('connect', () => {
      const user     = this.auth.currentUser;
      const clinicId = this.auth.clinicId;
      if (user && clinicId) {
        this.socket.emit('join_clinic', {
          clinicId,
          userId: user._id,
          role:   user.role,
        });
      }
    });

    this.socket.on('new_message', (payload: any) => {
      this._incomingMessage$.next(payload);
    });

    this.socket.on('presence_update', (data: { userId: string; online: boolean }) => {
      this._presenceUpdate$.next(data);
    });
  }

  // ── HTTP: Staff List ──────────────────────────────────────────────────────

  getStaffMembers(): Observable<StaffMember[]> {
    return this.http
      .get<{ success: boolean; staff: any[] }>(`${API}/chat/staff`, { headers: this._headers() })
      .pipe(map(res => res.staff));
  }

  // ── HTTP: Message History ─────────────────────────────────────────────────

  getMessages(contactId: string): Observable<ChatMessage[]> {
    const myId = this.auth.currentUser?._id;
    return this.http
      .get<{ success: boolean; messages: any[] }>(`${API}/chat/messages/${contactId}`, { headers: this._headers() })
      .pipe(
        map(res => res.messages.map(m => ({
          id:          m._id,
          contactId:   m.senderId === myId ? m.recipientId : m.senderId,
          text:        m.text,
          time:        new Date(m.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
          fromMe:      m.senderId === myId,
          attachment:  m.attachment,
        })))
      );
  }

  // ── Socket: Send Message ──────────────────────────────────────────────────

  sendMessage(recipientId: string, text: string, attachment?: MessageAttachment): void {
    const user     = this.auth.currentUser;
    const clinicId = this.auth.clinicId;
    if (!user || !clinicId) return;

    this.socket.emit('staff_message', {
      clinicId,
      senderId:    user._id,
      senderName:  user.publicName,
      senderRole:  user.role,
      recipientId,
      text,
      attachment: attachment ?? null,
    });
  }

  // ── Meetings (client-side state) ──────────────────────────────────────────

  scheduleMeeting(meeting: Omit<MeetingSchedule, 'id' | 'status'>): MeetingSchedule {
    const m: MeetingSchedule = { ...meeting, id: 'mtg-' + Date.now(), status: 'scheduled' };
    this._meetings.next([...this._meetings.value, m]);
    return m;
  }

  startMeeting(meetingId: string): void {
    this._meetings.next(
      this._meetings.value.map(m => m.id === meetingId ? { ...m, status: 'live' } : m)
    );
  }

  endMeeting(meetingId: string): void {
    this._meetings.next(
      this._meetings.value.map(m => m.id === meetingId ? { ...m, status: 'ended' } : m)
    );
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  roleColor(role: string): string {
    const map: Record<string, string> = {
      'Doctor':       '#60a5fa',
      'Receptionist': '#14b8a6',
      'Clinic Admin': '#a855f7',
      'Lab Manager':  '#f59e0b',
      'Pharmacist':   '#fb923c',
      'Cashier':      '#4ade80',
    };
    return map[role] ?? '#94a3b8';
  }

  private _headers(): HttpHeaders {
    return new HttpHeaders({ Authorization: `Bearer ${this.auth.token}` });
  }

  ngOnDestroy(): void {
    this.socket?.disconnect();
  }
}
