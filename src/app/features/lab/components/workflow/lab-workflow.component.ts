import { Component, OnInit, OnDestroy } from '@angular/core';
import { trigger, transition, style, animate, query, stagger } from '@angular/animations';
import { LabDataService, LabPatient, LabTest } from '../../../../core/services/lab-data.service';
import { SoundService } from '../../../../core/services/sound.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-lab-workflow',
  templateUrl: './lab-workflow.component.html',
  styleUrls: ['./lab-workflow.component.scss'],
  animations: [
    trigger('slideIn', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(16px)' }),
        animate('320ms cubic-bezier(0.35,0,0.25,1)', style({ opacity: 1, transform: 'translateY(0)' }))
      ])
    ]),
    trigger('listAnim', [
      transition('* => *', [
        query(':enter', [
          style({ opacity: 0, transform: 'translateX(-10px)' }),
          stagger(55, [animate('240ms ease', style({ opacity: 1, transform: 'translateX(0)' }))])
        ], { optional: true })
      ])
    ])
  ]
})
export class LabWorkflowComponent implements OnInit, OnDestroy {

  // ── Lookup ──────────────────────────────────────────────────────────────────
  searchId   = '';
  patient: LabPatient | null = null;
  loading    = false;
  notFound   = false;

  // ── Checklist selection ─────────────────────────────────────────────────────
  /** testId → selected for billing */
  selected: Record<string, boolean> = {};

  // ── Upload progress ─────────────────────────────────────────────────────────
  uploadingTestId: string | null = null;
  uploadProgress  = 0;

  // ── Notification state ──────────────────────────────────────────────────────
  completeSent = false;

  // ── Toast ───────────────────────────────────────────────────────────────────
  toastMsg : string | null = null;
  toastType: 'success' | 'error' | 'info' = 'success';

  // ── Stats ───────────────────────────────────────────────────────────────────
  stats = { testsToday: 0, billed: 0, uploaded: 0, pending: 0 };

  private subs: Subscription[] = [];

  constructor(
    private labData: LabDataService,
    private sound: SoundService
  ) {}

  ngOnInit(): void {
    this.labData.getDailyStats().subscribe(s => this.stats = s);
    this.subs.push(
      this.labData.uploadProgress$.subscribe(p => {
        if (p) { this.uploadingTestId = p.testId; this.uploadProgress = p.progress; }
        else   { this.uploadingTestId = null;      this.uploadProgress = 0; }
      })
    );
  }

  // ── Patient lookup ──────────────────────────────────────────────────────────
  lookup(): void {
    const id = this.searchId.trim();
    if (!id) return;
    this.loading  = true;
    this.patient  = null;
    this.notFound = false;
    this.selected = {};
    this.completeSent = false;

    this.labData.lookupPatient(id).subscribe(p => {
      this.loading = false;
      if (p) {
        this.patient = JSON.parse(JSON.stringify(p));
        // Pre-select tests that are already past pending
        this.patient!.tests.forEach(t => {
          this.selected[t.id] = t.status !== 'pending';
        });
        this.sound.playSuccess();
      } else {
        this.notFound = true;
        this.sound.playClick();
      }
    });
  }

  clearPatient(): void {
    this.patient  = null;
    this.searchId = '';
    this.notFound = false;
    this.selected = {};
    this.completeSent = false;
  }

  // ── Selection helpers ───────────────────────────────────────────────────────
  toggleSelect(test: LabTest): void {
    if (test.status !== 'pending') return;
    this.selected[test.id] = !this.selected[test.id];
  }

  get selectedPendingTests(): LabTest[] {
    return this.patient?.tests.filter(t => t.status === 'pending' && this.selected[t.id]) ?? [];
  }

  get selectedBillTotal(): number {
    return this.selectedPendingTests.reduce((s, t) => s + t.price, 0);
  }

  // ── Step 1 → Generate bill for selected tests ───────────────────────────────
  generateBill(): void {
    const targets = this.selectedPendingTests;
    if (!targets.length) {
      this.showToast('Select at least one pending test to bill.', 'error');
      return;
    }
    targets.forEach(t => t.status = 'billed');
    this.showToast(`Bill generated for ${targets.length} test(s) — ₹${this.selectedBillTotal}`, 'success');
    this.sound.playSuccess();
  }

  // ── Step 2 → Simulate payment confirmation (demo) ───────────────────────────
  confirmPayment(test: LabTest): void {
    if (test.status !== 'billed') return;
    test.paymentStatus = 'paid';
    test.status = 'paid';
    this.showToast(`Payment confirmed for ${test.name}`, 'success');
    this.sound.playSuccess();
  }

  // ── Step 3 → Upload result (enabled only after payment) ─────────────────────
  canUpload(test: LabTest): boolean {
    return test.paymentStatus === 'paid' && (test.status === 'paid' || test.status === 'billed');
  }

  async uploadResult(test: LabTest, event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file  = input.files?.[0];
    if (!file) return;

    if (test.paymentStatus !== 'paid') {
      this.showToast('Payment must be confirmed before uploading.', 'error');
      return;
    }

    const allowed = ['image/jpeg', 'image/png', 'application/pdf'];
    if (!allowed.includes(file.type)) {
      this.showToast('Only JPG, PNG, or PDF files are accepted.', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
      test.uploadedFile     = e.target?.result as string;
      test.uploadedFileName = file.name;
      test.status           = 'uploaded';

      await this.labData.simulateUpload(test.id);

      test.uploadedAt = new Date().toLocaleString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
      });
      this.showToast(`${test.name} uploaded — ${file.name}`, 'success');
      this.sound.playSuccess();
    };
    reader.readAsDataURL(file);
    input.value = '';
  }

  // ── Step 4 → Complete & notify ───────────────────────────────────────────────
  canComplete(): boolean {
    if (!this.patient || !this.patient.tests.length) return false;
    // At least one uploaded, none still in pending/billed/paid
    const nonPending = this.patient.tests.filter(t => t.status !== 'pending');
    return nonPending.length > 0 &&
      nonPending.every(t => t.status === 'uploaded' || t.status === 'completed');
  }

  completeAll(): void {
    if (!this.patient) return;
    if (!this.canComplete()) {
      this.showToast('All billed tests must be uploaded before completing.', 'error');
      return;
    }
    this.patient.tests.forEach(t => {
      if (t.status === 'uploaded') t.status = 'completed';
    });
    this.labData.sendCompletionNotification(
      this.patient.name, this.patient.doctor, 'all tests'
    );
    this.completeSent = true;
    this.showToast(
      `Reports marked complete. Notifications sent to ${this.patient.name} & ${this.patient.doctor}.`,
      'success'
    );
    this.sound.playSuccess();
  }

  // ── Computed totals ──────────────────────────────────────────────────────────
  get totalBill(): number {
    return this.patient?.tests.reduce((s, t) => s + t.price, 0) ?? 0;
  }

  get paidAmount(): number {
    return this.patient?.tests
      .filter(t => t.paymentStatus === 'paid')
      .reduce((s, t) => s + t.price, 0) ?? 0;
  }

  get uploadedCount(): number {
    return this.patient?.tests.filter(t => t.status === 'uploaded' || t.status === 'completed').length ?? 0;
  }

  // ── Workflow step indicator ──────────────────────────────────────────────────
  get currentStep(): 1 | 2 | 3 | 4 {
    if (!this.patient) return 1;
    const tests = this.patient.tests;
    if (tests.every(t => t.status === 'completed')) return 4;
    if (tests.some(t => t.status === 'uploaded'))   return 3;
    if (tests.some(t => t.status === 'paid' || t.status === 'billed')) return 2;
    return 1;
  }

  // ── Helpers ──────────────────────────────────────────────────────────────────
  patientInitials(name: string): string {
    return name.split(' ').filter(Boolean).map(w => w[0]).join('').slice(0, 2).toUpperCase();
  }

  statusLabel(s: string): string {
    return ({ pending: 'Pending', billed: 'Billed', paid: 'Paid',
              uploaded: 'Uploaded', completed: 'Completed' } as any)[s] ?? s;
  }

  statusColor(s: string): string {
    return ({ pending: '#94a3b8', billed: '#f59e0b', paid: '#60a5fa',
              uploaded: '#a855f7', completed: '#14b8a6' } as any)[s] ?? '#94a3b8';
  }

  statusBg(s: string): string {
    return ({ pending: 'rgba(148,163,184,0.12)', billed: 'rgba(245,158,11,0.12)',
              paid: 'rgba(96,165,250,0.12)', uploaded: 'rgba(168,85,247,0.12)',
              completed: 'rgba(20,184,166,0.12)' } as any)[s] ?? 'rgba(148,163,184,0.12)';
  }

  private showToast(msg: string, type: 'success' | 'error' | 'info'): void {
    this.toastMsg  = msg;
    this.toastType = type;
    setTimeout(() => this.toastMsg = null, 3500);
  }

  ngOnDestroy(): void { this.subs.forEach(s => s.unsubscribe()); }
}
