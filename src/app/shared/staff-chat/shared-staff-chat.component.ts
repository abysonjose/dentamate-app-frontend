import {
  Component, OnInit, OnDestroy, ViewChild, ElementRef,
  AfterViewChecked, Input
} from '@angular/core';
import { trigger, transition, style, animate } from '@angular/animations';
import { Subscription } from 'rxjs';
import {
  StaffChatService, StaffMember, ChatMessage,
  MessageAttachment, MeetingSchedule, AttachmentType
} from '../../core/services/staff-chat.service';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-shared-staff-chat',
  templateUrl: './shared-staff-chat.component.html',
  styleUrls: ['./shared-staff-chat.component.scss'],
  animations: [
    trigger('msgIn', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(8px)' }),
        animate('180ms ease', style({ opacity: 1, transform: 'translateY(0)' }))
      ])
    ]),
    trigger('panelSlide', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateX(20px)' }),
        animate('220ms ease', style({ opacity: 1, transform: 'translateX(0)' }))
      ]),
      transition(':leave', [
        animate('150ms ease', style({ opacity: 0, transform: 'translateX(20px)' }))
      ])
    ])
  ]
})
export class SharedStaffChatComponent implements OnInit, AfterViewChecked, OnDestroy {
  @Input() currentUserId = 'me';
  @Input() currentUserName = 'You';
  @Input() currentUserRole = 'Staff';

  @ViewChild('msgList') msgListRef!: ElementRef<HTMLDivElement>;
  @ViewChild('fileInput') fileInputRef!: ElementRef<HTMLInputElement>;

  staff: StaffMember[] = [];
  activeContact: StaffMember | null = null;
  messages: ChatMessage[] = [];
  newMessage = '';
  private shouldScroll = false;
  private sub!: Subscription;
  private _extraSubs: Subscription[] = [];

  // Media
  pendingAttachment: MessageAttachment | null = null;
  attachMenuOpen = false;

  // Meeting
  showMeetingPanel = false;
  meetingTitle = '';
  meetingDate = '';
  meetingTime = '';
  selectedParticipants: string[] = [];
  meetings: MeetingSchedule[] = [];

  // Active meeting (in-call)
  activeMeeting: MeetingSchedule | null = null;
  screenSharing = false;
  micMuted = false;
  camOff = false;

  // Direct call
  activeCall: StaffMember | null = null;

  constructor(public chatService: StaffChatService, private auth: AuthService) {}

  ngOnInit(): void {
    // Pull identity from auth instead of hardcoded inputs
    const user = this.auth.currentUser;
    if (user) {
      this.currentUserId   = user._id;
      this.currentUserName = user.publicName;
      this.currentUserRole = user.role;
    }

    this.chatService.getStaffMembers().subscribe(s => {
      this.staff = s;
      if (s.length) this.selectContact(s[0]);
    });

    // React to incoming socket messages
    const msgSub = this.chatService.incomingMessage$.subscribe(payload => {
      if (!payload) return;
      const myId = this.auth.currentUser?._id;
      const isForActiveContact =
        (payload.senderId === this.activeContact?.id) ||
        (payload.recipientId === this.activeContact?.id && payload.senderId === myId);
      if (isForActiveContact) {
        const msg: ChatMessage = {
          id:         payload._id,
          contactId:  this.activeContact!.id,
          text:       payload.text,
          time:       new Date(payload.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
          fromMe:     payload.senderId === myId,
          attachment: payload.attachment,
        };
        this.messages = [...this.messages, msg];
        this.shouldScroll = true;
      }
      // bump unread for other contacts
      if (payload.senderId !== myId && payload.senderId !== this.activeContact?.id) {
        const contact = this.staff.find(s => s.id === payload.senderId);
        if (contact) {
          contact.unread = (contact.unread ?? 0) + 1;
          contact.lastMessage = payload.text;
          contact.lastTime = new Date(payload.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
        }
      }
    });

    // React to presence updates
    const presenceSub = this.chatService.presenceUpdate$.subscribe(p => {
      if (!p) return;
      const member = this.staff.find(s => s.id === p.userId);
      if (member) member.online = p.online;
    });

    const meetingSub = this.chatService.meetings$.subscribe(m => {
      this.meetings = m;
      const live = m.find(mt => mt.status === 'live' &&
        (mt.participants.includes(this.currentUserId) || mt.hostId === this.currentUserId));
      if (live && !this.activeMeeting) this.activeMeeting = live;
    });

    this.sub = msgSub;
    this._extraSubs = [presenceSub, meetingSub];
  }

  ngAfterViewChecked(): void {
    if (this.shouldScroll) { this.scrollToBottom(); this.shouldScroll = false; }
  }

  selectContact(s: StaffMember): void {
    this.activeContact = s;
    s.unread = 0;
    this.chatService.getMessages(s.id).subscribe(m => {
      this.messages = m;
      this.shouldScroll = true;
    });
  }

  // ── Send ──────────────────────────────────────────────────────────────────

  send(): void {
    const text = this.newMessage.trim();
    if ((!text && !this.pendingAttachment) || !this.activeContact) return;

    // Emit via socket (backend will persist + broadcast back)
    this.chatService.sendMessage(this.activeContact.id, text, this.pendingAttachment ?? undefined);

    // Optimistic local echo
    const msg: ChatMessage = {
      id:         'm' + Date.now(),
      contactId:  this.activeContact.id,
      text,
      time:       new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      fromMe:     true,
      attachment: this.pendingAttachment ?? undefined,
    };
    this.messages = [...this.messages, msg];
    this.newMessage = '';
    this.pendingAttachment = null;
    this.shouldScroll = true;
  }

  onKeydown(e: KeyboardEvent): void {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); this.send(); }
  }

  // ── Attachments ───────────────────────────────────────────────────────────

  triggerFileInput(type: AttachmentType): void {
    this.attachMenuOpen = false;
    const input = this.fileInputRef.nativeElement;
    if (type === 'image')    input.accept = 'image/*';
    if (type === 'video')    input.accept = 'video/*';
    if (type === 'document') input.accept = '.pdf,.doc,.docx,.xls,.xlsx,.txt';
    input.click();
  }

  onFileSelected(e: Event): void {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const type: AttachmentType =
      file.type.startsWith('image/') ? 'image' :
      file.type.startsWith('video/') ? 'video' : 'document';
    const url = URL.createObjectURL(file);
    const kb = (file.size / 1024).toFixed(1);
    this.pendingAttachment = { type, name: file.name, url, size: kb + ' KB' };
    (e.target as HTMLInputElement).value = '';
  }

  removePending(): void { this.pendingAttachment = null; }

  // ── Meeting ───────────────────────────────────────────────────────────────

  toggleParticipant(id: string): void {
    this.selectedParticipants = this.selectedParticipants.includes(id)
      ? this.selectedParticipants.filter(p => p !== id)
      : [...this.selectedParticipants, id];
  }

  scheduleMeeting(): void {
    if (!this.meetingTitle || !this.meetingDate || !this.meetingTime) return;
    const dt = new Date(`${this.meetingDate}T${this.meetingTime}`);
    const meeting = this.chatService.scheduleMeeting({
      title: this.meetingTitle,
      scheduledAt: dt,
      hostId: this.currentUserId,
      hostName: this.currentUserName,
      participants: [...this.selectedParticipants]
    });
    // broadcast meeting message to all participants
    const meetingMsg: ChatMessage = {
      id: 'm' + Date.now(),
      contactId: this.activeContact?.id ?? '',
      text: '',
      time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      fromMe: true,
      meeting
    };
    this.messages = [...this.messages, meetingMsg];
    this.meetingTitle = '';
    this.meetingDate = '';
    this.meetingTime = '';
    this.selectedParticipants = [];
    this.showMeetingPanel = false;
    this.shouldScroll = true;
  }

  joinMeeting(meeting: MeetingSchedule): void {
    this.chatService.startMeeting(meeting.id);
    this.activeMeeting = { ...meeting, status: 'live' };
  }

  leaveMeeting(): void {
    if (this.activeMeeting) {
      if (this.activeMeeting.hostId === this.currentUserId) {
        this.chatService.endMeeting(this.activeMeeting.id);
      }
      this.activeMeeting = null;
      this.screenSharing = false;
      this.micMuted = false;
      this.camOff = false;
    }
  }

  startDirectCall(): void {
    if (!this.activeContact) return;
    this.activeCall = this.activeContact;
    this.micMuted = false;
    this.camOff = false;
    this.screenSharing = false;
  }

  endDirectCall(): void {
    this.activeCall = null;
    this.screenSharing = false;
    this.micMuted = false;
    this.camOff = false;
  }

  toggleScreenShare(): void { this.screenSharing = !this.screenSharing; }
  toggleMic(): void { this.micMuted = !this.micMuted; }
  toggleCam(): void { this.camOff = !this.camOff; }

  // ── Helpers ───────────────────────────────────────────────────────────────

  get totalUnread(): number { return this.staff.reduce((s, c) => s + (c.unread ?? 0), 0); }

  formatMeetingTime(dt: Date): string {
    return new Date(dt).toLocaleString('en-US', {
      weekday: 'short', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  }

  participantName(id: string): string {
    return this.staff.find(s => s.id === id)?.name ?? id;
  }

  private scrollToBottom(): void {
    try { this.msgListRef.nativeElement.scrollTop = this.msgListRef.nativeElement.scrollHeight; } catch {}
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
    this._extraSubs.forEach(s => s.unsubscribe());
  }
}
