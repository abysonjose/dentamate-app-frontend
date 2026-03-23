import { Component, OnInit } from '@angular/core';
import { trigger, transition, style, animate } from '@angular/animations';
import { CashierDataService, PatientBill } from '../../../../core/services/cashier-data.service';
import { SoundService } from '../../../../core/services/sound.service';

@Component({
  selector: 'app-cashier-billing',
  templateUrl: './cashier-billing.component.html',
  styleUrls: ['./cashier-billing.component.scss'],
  animations: [
    trigger('fadeSlide', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(12px)' }),
        animate('320ms cubic-bezier(0.35,0,0.25,1)', style({ opacity: 1, transform: 'translateY(0)' }))
      ])
    ]),
    trigger('successPop', [
      transition(':enter', [
        style({ opacity: 0, transform: 'scale(0.85)' }),
        animate('400ms cubic-bezier(0.34,1.56,0.64,1)', style({ opacity: 1, transform: 'scale(1)' }))
      ]),
      transition(':leave', [
        animate('200ms ease', style({ opacity: 0, transform: 'scale(0.9)' }))
      ])
    ])
  ]
})
export class CashierBillingComponent implements OnInit {

  // ── State ─────────────────────────────────────────────────────────────────
  searchQuery   = '';
  searching     = false;
  bill: PatientBill | null = null;
  bills: PatientBill[] = [];
  notFound      = false;
  processing    = false;
  paymentSuccess = false;
  errorMsg      = '';

  selectedMethod: 'cash' | 'card' | 'upi' | 'razorpay' = 'cash';
  readonly paymentMethods: Array<'cash' | 'card' | 'upi' | 'razorpay'> = ['cash', 'card', 'upi', 'razorpay'];
  totals = { paid: 0, pending: 0, total: 0 };

  constructor(
    public cashierData: CashierDataService,
    private sound: SoundService
  ) {}

  ngOnInit(): void {
    this.loadBills();
  }

  // ── Load all bills ────────────────────────────────────────────────────────

  loadBills(): void {
    this.cashierData.getBills().subscribe({
      next: bills => {
        this.bills = bills;
        this.totals = this.cashierData.calcTotals(bills);
      },
      error: () => {} // silently fail on dashboard load
    });
  }

  // ── Search ────────────────────────────────────────────────────────────────

  search(): void {
    if (!this.searchQuery.trim()) return;
    this.searching = true;
    this.bill = null;
    this.notFound = false;
    this.paymentSuccess = false;
    this.errorMsg = '';

    // Search by patientId query param
    this.cashierData.getBills(this.searchQuery.trim()).subscribe({
      next: bills => {
        this.searching = false;
        const pending = bills.find(b => b.paymentStatus !== 'paid') ?? bills[0] ?? null;
        if (pending) { this.bill = pending; this.sound.playClick(); }
        else { this.notFound = true; }
      },
      error: () => {
        this.searching = false;
        this.notFound = true;
      }
    });
  }

  onSearchKey(e: KeyboardEvent): void {
    if (e.key === 'Enter') this.search();
  }

  // ── Payment actions ───────────────────────────────────────────────────────

  markAsPaid(): void {
    if (!this.bill || this.bill.paymentStatus === 'paid') return;
    if (this.selectedMethod === 'razorpay') { this.payWithRazorpay(); return; }

    this.processing = true;
    this.errorMsg = '';
    this.cashierData.markAsPaid(this.bill._id, this.selectedMethod as 'cash' | 'card' | 'upi').subscribe({
      next: updated => {
        this.processing = false;
        this.paymentSuccess = true;
        this.bill = updated;
        this.sound.playSuccess();
        this.loadBills();
      },
      error: err => {
        this.processing = false;
        this.errorMsg = err?.error?.message || 'Payment failed. Please try again.';
      }
    });
  }

  payWithRazorpay(): void {
    if (!this.bill) return;
    this.processing = true;
    this.errorMsg = '';

    const patient = this.bill.patient;
    this.cashierData.payWithRazorpay(
      this.bill,
      patient?.publicName || '',
      patient?.email || '',
      patient?.phone || ''
    ).subscribe({
      next: updated => {
        this.processing = false;
        this.paymentSuccess = true;
        this.bill = updated;
        this.sound.playSuccess();
        this.loadBills();
      },
      error: err => {
        this.processing = false;
        // Don't show error if user just dismissed the modal
        if (err?.message !== 'Payment cancelled by user') {
          this.errorMsg = err?.message || 'Razorpay payment failed.';
        }
      }
    });
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  methodLabel(m: string): string {
    return ({ cash: '💵 Cash', card: '💳 Card', upi: '📱 UPI', razorpay: '🔒 Razorpay' } as any)[m] ?? m;
  }

  statusColor(s: string): string {
    return ({ paid: '#10b981', pending: '#f59e0b', partial: '#60a5fa', refunded: '#a78bfa' } as any)[s] ?? '#94a3b8';
  }

  statusBg(s: string): string {
    return ({ paid: 'rgba(16,185,129,0.12)', pending: 'rgba(245,158,11,0.12)', partial: 'rgba(96,165,250,0.12)', refunded: 'rgba(167,139,250,0.12)' } as any)[s] ?? 'rgba(148,163,184,0.12)';
  }

  clearSearch(): void {
    this.searchQuery = '';
    this.bill = null;
    this.notFound = false;
    this.paymentSuccess = false;
    this.errorMsg = '';
    this.selectedMethod = 'cash';
  }
}
