import { Component, OnInit, OnDestroy } from '@angular/core';
import { trigger, transition, style, animate, query, stagger } from '@angular/animations';
import { Subscription } from 'rxjs';
import { QueueService, TokenQueue, TokenEntry } from '../../../../core/services/queue.service';
import { AuthService } from '../../../../core/services/auth.service';
import {
  ReceptionistDataService,
  QueueDoctor, AppointmentSummary, LeaveDoctor,
} from '../../../../core/services/receptionist-data.service';

@Component({
  selector: 'app-rec-live-queue',
  templateUrl: './live-queue.component.html',
  styleUrls: ['./live-queue.component.scss'],
  animations: [
    trigger('cardAnim', [
      transition('* => *', [
        query(':enter', [
          style({ opacity: 0, transform: 'translateY(16px)' }),
          stagger(60, [animate('300ms ease', style({ opacity: 1, transform: 'translateY(0)' }))])
        ], { optional: true })
      ])
    ]),
    trigger('pulseAnim', [
      transition(':enter', [
        style({ opacity: 0, transform: 'scale(0.9)' }),
        animate('250ms ease', style({ opacity: 1, transform: 'scale(1)' }))
      ])
    ])
  ]
})
export class LiveQueueComponent implements OnInit, OnDestroy {

  // ── Live queue state (from backend) ──────────────────────────────────────
  queue: TokenQueue | null = null;
  loading = true;
  pulsingToken: number | null = null;

  // ── Add-to-queue form ─────────────────────────────────────────────────────
  showAddForm = false;
  addForm = { patientId: '', patientName: '', doctorId: '', isWalkIn: true };
  addError = '';
  addLoading = false;

  // ── Static/mock data (doctors list, summary, leave) ───────────────────────
  doctors: QueueDoctor[] = [];
  summary: AppointmentSummary | null = null;
  leaveDoctors: LeaveDoctor[] = [];

  private subs: Subscription[] = [];

  constructor(
    public queueSvc: QueueService,
    private auth: AuthService,
    private data: ReceptionistDataService,
  ) {}

  ngOnInit(): void {
    // Connect socket to clinic room
    this.queueSvc.connect(this.auth.clinicId, this.auth.userId, this.auth.role);

    // Load today's queue from backend
    this.queueSvc.getTodayQueue().subscribe({
      next: () => (this.loading = false),
      error: () => (this.loading = false),
    });

    // Subscribe to live queue state
    this.subs.push(
      this.queueSvc.queue$.subscribe(q => (this.queue = q))
    );

    // Pulse animation on new token
    this.subs.push(
      this.queueSvc.queuePulse$.subscribe(tokenNum => {
        this.pulsingToken = tokenNum;
        setTimeout(() => (this.pulsingToken = null), 2500);
      })
    );

    // Static data (doctors, summary, leave) — replace with real API calls when ready
    this.data.getQueueDoctors().subscribe(d => (this.doctors = d));
    this.data.getAppointmentSummary().subscribe(s => (this.summary = s));
    this.data.getLeaveDoctors().subscribe(l => (this.leaveDoctors = l));
  }

  // ── Add patient to queue ──────────────────────────────────────────────────

  openAddForm(): void {
    this.showAddForm = true;
    this.addError = '';
    this.addForm = { patientId: '', patientName: '', doctorId: '', isWalkIn: true };
  }

  submitAddToQueue(): void {
    if (!this.addForm.patientName.trim()) {
      this.addError = 'Patient name is required';
      return;
    }
    this.addLoading = true;
    this.addError = '';

    this.queueSvc.addToQueue({
      patientId: this.addForm.patientId || `WALKIN-${Date.now()}`,
      patientName: this.addForm.patientName,
      doctorId: this.addForm.doctorId || undefined,
      isWalkIn: this.addForm.isWalkIn,
    }).subscribe({
      next: (res) => {
        this.addLoading = false;
        this.showAddForm = false;
        // queue$ BehaviorSubject auto-updates via QueueService tap()
      },
      error: (err) => {
        this.addLoading = false;
        this.addError = err?.error?.message || 'Failed to add patient';
      },
    });
  }

  // ── Token status helpers ──────────────────────────────────────────────────

  cancelToken(tokenNumber: number): void {
    this.queueSvc.updateTokenStatus(tokenNumber, 'cancelled').subscribe();
  }

  get waitingTokens(): TokenEntry[] {
    return this.queue?.tokens.filter(t => t.status === 'waiting') ?? [];
  }

  get inProgressToken(): TokenEntry | undefined {
    return this.queue?.tokens.find(t => t.status === 'in_progress');
  }

  get totalWaiting(): number {
    return this.waitingTokens.length;
  }

  patientName(entry: TokenEntry): string {
    if (typeof entry.patient === 'object') return entry.patient.publicName;
    return entry.patientName || '—';
  }

  statusColor(status: TokenEntry['status']): string {
    const map: Record<string, string> = {
      waiting: '#f59e0b', arrived: '#818cf8', in_progress: '#4ade80',
      completed: '#94a3b8', skipped: '#f87171', cancelled: '#ef4444',
    };
    return map[status] ?? '#94a3b8';
  }

  doctorStatusColor(status: QueueDoctor['status']): string {
    return { available: '#4ade80', busy: '#f59e0b', break: '#f87171' }[status] ?? '#94a3b8';
  }

  ngOnDestroy(): void {
    this.subs.forEach(s => s.unsubscribe());
  }
}
