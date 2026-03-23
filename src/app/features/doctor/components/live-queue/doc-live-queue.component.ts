import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { trigger, transition, style, animate, query, stagger } from '@angular/animations';
import { Subscription, interval } from 'rxjs';
import { QueueService, TokenQueue, TokenEntry } from '../../../../core/services/queue.service';
import { AuthService } from '../../../../core/services/auth.service';
import { DoctorDataService, DailyStats } from '../../../../core/services/doctor-data.service';

@Component({
  selector: 'app-doc-live-queue',
  templateUrl: './doc-live-queue.component.html',
  styleUrls: ['./doc-live-queue.component.scss'],
  animations: [
    trigger('listAnim', [
      transition('* => *', [
        query(':enter', [
          style({ opacity: 0, transform: 'translateX(-16px)' }),
          stagger(50, [animate('280ms ease', style({ opacity: 1, transform: 'translateX(0)' }))])
        ], { optional: true })
      ])
    ]),
    trigger('slideIn', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(-8px)' }),
        animate('250ms ease', style({ opacity: 1, transform: 'translateY(0)' }))
      ]),
      transition(':leave', [
        animate('180ms ease', style({ opacity: 0, transform: 'translateY(-8px)' }))
      ])
    ]),
    trigger('bannerAnim', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(-12px)', maxHeight: '0' }),
        animate('300ms cubic-bezier(0.35,0,0.25,1)', style({ opacity: 1, transform: 'translateY(0)', maxHeight: '80px' }))
      ]),
      transition(':leave', [
        animate('200ms ease', style({ opacity: 0, transform: 'translateY(-8px)', maxHeight: '0' }))
      ])
    ])
  ]
})
export class DocLiveQueueComponent implements OnInit, OnDestroy {

  // ── Live queue state (from backend via QueueService) ─────────────────────
  queue: TokenQueue | null = null;
  stats: DailyStats | null = null;
  loading = true;
  pulsingToken: number | null = null;

  // ── OP State ──────────────────────────────────────────────────────────────
  opActive = false;
  opStartTime: Date | null = null;
  rfidInput = '';
  rfidError = '';
  rfidSuccess = '';
  scanFlash = false;
  stopConfirmOpen = false;

  // ── Leave Modal ───────────────────────────────────────────────────────────
  leaveModalOpen = false;
  leaveReason = '';
  leaveSent = false;

  // ── Drag & Drop ───────────────────────────────────────────────────────────
  dragIndex: number | null = null;
  dragOverIndex: number | null = null;

  // ── Call-next loading ─────────────────────────────────────────────────────
  callingNext = false;

  private subs: Subscription[] = [];
  private rfidSimSub: Subscription | null = null;

  @ViewChild('rfidField') rfidField!: ElementRef<HTMLInputElement>;

  constructor(
    public queueSvc: QueueService,
    private auth: AuthService,
    private data: DoctorDataService,
  ) {}

  ngOnInit(): void {
    // Connect socket (may already be connected from receptionist, idempotent)
    this.queueSvc.connect(this.auth.clinicId, this.auth.userId, this.auth.role);

    // Load today's queue
    this.queueSvc.getTodayQueue().subscribe({
      next: () => (this.loading = false),
      error: () => (this.loading = false),
    });

    // Subscribe to live queue state
    this.subs.push(
      this.queueSvc.queue$.subscribe(q => (this.queue = q))
    );

    // Pulse animation when a token is called
    this.subs.push(
      this.queueSvc.queuePulse$.subscribe(tokenNum => {
        this.pulsingToken = tokenNum;
        setTimeout(() => (this.pulsingToken = null), 3000);
      })
    );

    // Stats (still from mock — replace with real API when available)
    this.data.getDailyStats().subscribe(s => (this.stats = s));
  }

  // ── OP Controls ───────────────────────────────────────────────────────────

  startOP(): void {
    this.opActive = true;
    this.opStartTime = new Date();
    this.rfidError = '';
    this.rfidSuccess = '';
    this.rfidSimSub = interval(20000).subscribe(() => this.simulateRfid());
    setTimeout(() => this.rfidField?.nativeElement.focus(), 100);
  }

  stopOP(): void {
    this.opActive = false;
    this.opStartTime = null;
    this.rfidInput = '';
    this.rfidError = '';
    this.rfidSuccess = '';
    this.stopConfirmOpen = false;
    this.rfidSimSub?.unsubscribe();
    this.rfidSimSub = null;
  }

  confirmStopOP(): void {
    if (this.waitingCount > 0) {
      this.stopConfirmOpen = true;
    } else {
      this.stopOP();
    }
  }

  get opDuration(): string {
    if (!this.opStartTime) return '';
    const diff = Math.floor((Date.now() - this.opStartTime.getTime()) / 1000);
    const h = Math.floor(diff / 3600);
    const m = Math.floor((diff % 3600) / 60);
    const s = diff % 60;
    if (h > 0) return `${h}h ${m}m`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  }

  // ── Call Next Patient (real backend call) ─────────────────────────────────

  callNextPatient(): void {
    if (this.callingNext) return;
    this.callingNext = true;
    this.queueSvc.callNext().subscribe({
      next: (res) => {
        this.callingNext = false;
        this.rfidSuccess = `Token #${res.calledToken} — ${res.patient} called.`;
        this.triggerScanFlash();
        setTimeout(() => (this.rfidSuccess = ''), 4000);
      },
      error: (err) => {
        this.callingNext = false;
        this.rfidError = err?.error?.message || 'No patients waiting';
        setTimeout(() => (this.rfidError = ''), 4000);
      },
    });
  }

  // ── Mark token done ───────────────────────────────────────────────────────

  markDone(tokenNumber: number): void {
    this.queueSvc.updateTokenStatus(tokenNumber, 'completed').subscribe({
      next: () => {
        if (this.stats) {
          this.stats = { ...this.stats, completed: this.stats.completed + 1, pending: Math.max(0, this.stats.pending - 1) };
        }
      },
    });
  }

  markSkipped(tokenNumber: number): void {
    this.queueSvc.updateTokenStatus(tokenNumber, 'skipped').subscribe();
  }

  // ── RFID Scan (walk-in via doctor panel) ──────────────────────────────────

  onRfidKeydown(e: KeyboardEvent): void {
    if (e.key === 'Enter') this.processRfidScan();
  }

  processRfidScan(): void {
    const raw = this.rfidInput.trim();
    if (!raw) return;
    this.rfidError = '';
    this.rfidSuccess = '';

    // Add as walk-in via backend
    this.queueSvc.addToQueue({
      patientId: raw,
      patientName: `Walk-in · ${raw}`,
      isWalkIn: true,
    }).subscribe({
      next: (res) => {
        this.rfidSuccess = `Token #${res.tokenNumber} assigned to ${raw}.`;
        this.triggerScanFlash();
        setTimeout(() => (this.rfidSuccess = ''), 4000);
      },
      error: (err) => {
        this.rfidError = err?.error?.message || 'Failed to add walk-in';
        setTimeout(() => (this.rfidError = ''), 4000);
      },
    });

    this.rfidInput = '';
  }

  simulateRfid(): void {
    if (!this.opActive) return;
    const fakeId = `RFID-${Math.floor(Math.random() * 9000) + 1000}`;
    this.rfidInput = fakeId;
    this.processRfidScan();
  }

  private triggerScanFlash(): void {
    this.scanFlash = true;
    setTimeout(() => (this.scanFlash = false), 600);
  }

  // ── Drag & Drop (local reorder only — cosmetic) ───────────────────────────

  onDragStart(index: number): void { this.dragIndex = index; }

  onDragOver(e: DragEvent, index: number): void {
    e.preventDefault();
    this.dragOverIndex = index;
  }

  onDrop(targetIndex: number): void {
    if (this.dragIndex === null || this.dragIndex === targetIndex) {
      this.dragIndex = null; this.dragOverIndex = null; return;
    }
    const tokens = [...(this.queue?.tokens ?? [])];
    const [moved] = tokens.splice(this.dragIndex, 1);
    tokens.splice(targetIndex, 0, moved);
    if (this.queue) this.queue = { ...this.queue, tokens };
    this.dragIndex = null;
    this.dragOverIndex = null;
  }

  onDragEnd(): void { this.dragIndex = null; this.dragOverIndex = null; }

  // ── Leave Request ─────────────────────────────────────────────────────────

  openLeaveModal(): void { this.leaveModalOpen = true; this.leaveSent = false; this.leaveReason = ''; }
  closeLeaveModal(): void { this.leaveModalOpen = false; }

  submitLeave(): void {
    if (!this.leaveReason.trim()) return;
    this.leaveSent = true;
    setTimeout(() => (this.leaveModalOpen = false), 2000);
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  get waitingTokens(): TokenEntry[] {
    return this.queue?.tokens.filter(t => t.status === 'waiting') ?? [];
  }

  get inProgressToken(): TokenEntry | undefined {
    return this.queue?.tokens.find(t => t.status === 'in_progress');
  }

  get waitingCount(): number { return this.waitingTokens.length; }

  patientName(entry: TokenEntry): string {
    if (typeof entry.patient === 'object') return entry.patient.publicName;
    return entry.patientName || '—';
  }

  statusColor(s: TokenEntry['status']): string {
    const map: Record<string, string> = {
      waiting: '#f59e0b', in_progress: '#4ade80',
      completed: '#94a3b8', skipped: '#f87171', cancelled: '#ef4444',
    };
    return map[s] ?? '#94a3b8';
  }

  statusLabel(s: TokenEntry['status']): string {
    const map: Record<string, string> = {
      waiting: 'Waiting', in_progress: 'In Consultation',
      completed: 'Done', skipped: 'Skipped', cancelled: 'Cancelled',
    };
    return map[s] ?? s;
  }

  ngOnDestroy(): void {
    this.subs.forEach(s => s.unsubscribe());
    this.rfidSimSub?.unsubscribe();
  }
}
