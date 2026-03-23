import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, Subject, of, delay } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { AuthService } from './auth.service';

// ── Interfaces ────────────────────────────────────────────────────────────────

export interface BillItem {
  description: string;
  type: 'treatment' | 'medication' | 'lab' | 'other';
  amount: number;
}

export interface FinancialSummary {
  month: string;
  received: number;
  pending: number;
}

export interface CashierNotification {
  id: string;
  type: 'maintenance' | 'payment' | 'alert';
  title: string;
  message: string;
  time: string;
  read: boolean;
  severity: 'info' | 'warning' | 'critical';
}

export interface CashierChatContact {
  id: string;
  name: string;
  role: string;
  online: boolean;
  lastMessage: string;
  unread: number;
}

export interface PatientBill {
  _id: string;
  clinic: string;
  patient: { _id: string; publicName: string; email: string; phone: string };
  doctor: { _id: string; publicName: string };
  appointmentId?: string;
  prescription?: string;
  items: BillItem[];
  subtotal: number;
  discount: number;
  tax: number;
  totalAmount: number;
  paymentStatus: 'pending' | 'partial' | 'paid' | 'refunded';
  paymentMethod?: string;
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  generatedBy?: { _id: string; publicName: string };
  createdAt: string;
  updatedAt: string;
}

export interface RazorpayOrder {
  id: string;
  amount: number;
  currency: string;
  receipt: string;
}

// Declare Razorpay global (loaded via CDN in index.html)
declare const Razorpay: any;

// ── Service ───────────────────────────────────────────────────────────────────

@Injectable({ providedIn: 'root' })
export class CashierDataService {

  private readonly API = 'http://localhost:5000/api/billing';

  // Emits billId when a payment is confirmed (cash/card/upi or razorpay)
  private _paymentConfirmed = new Subject<string>();
  paymentConfirmed$ = this._paymentConfirmed.asObservable();

  constructor(private http: HttpClient, private auth: AuthService) {}

  private get headers(): HttpHeaders {
    return new HttpHeaders({ Authorization: `Bearer ${this.auth.token}` });
  }

  // ── Fetch bills ───────────────────────────────────────────────────────────

  getBills(patientId?: string, paymentStatus?: string): Observable<PatientBill[]> {
    let params: any = {};
    if (patientId)     params['patientId']     = patientId;
    if (paymentStatus) params['paymentStatus'] = paymentStatus;
    return this.http
      .get<{ success: boolean; bills: PatientBill[] }>(this.API, { headers: this.headers, params })
      .pipe(map(r => r.bills));
  }

  // ── Mark paid (cash / card / UPI) ─────────────────────────────────────────

  markAsPaid(billId: string, paymentMethod: 'cash' | 'card' | 'upi'): Observable<PatientBill> {
    return this.http
      .patch<{ success: boolean; bill: PatientBill }>(
        `${this.API}/${billId}/mark-paid`,
        { paymentMethod },
        { headers: this.headers }
      )
      .pipe(
        map(r => r.bill),
        tap(bill => this._paymentConfirmed.next(bill._id))
      );
  }

  // ── Razorpay online payment ───────────────────────────────────────────────

  /**
   * Creates a Razorpay order, opens the checkout modal, and on success
   * calls verify-payment on the backend. Returns the verified bill.
   */
  payWithRazorpay(bill: PatientBill, patientName: string, patientEmail: string, patientPhone: string): Observable<PatientBill> {
    return new Observable(observer => {
      // Step 1: create order on backend
      this.http
        .post<{ success: boolean; order: RazorpayOrder; key: string }>(
          `${this.API}/${bill._id}/razorpay-order`,
          {},
          { headers: this.headers }
        )
        .subscribe({
          next: ({ order, key }) => {
            // Step 2: open Razorpay checkout
            const options = {
              key,
              amount: order.amount,
              currency: order.currency,
              name: 'DentaMate',
              description: `Bill #${bill._id}`,
              order_id: order.id,
              prefill: {
                name:    patientName,
                email:   patientEmail,
                contact: patientPhone,
              },
              theme: { color: '#6366f1' },
              handler: (response: any) => {
                // Step 3: verify signature on backend
                this.http
                  .post<{ success: boolean; bill: PatientBill }>(
                    `${this.API}/${bill._id}/verify-payment`,
                    {
                      razorpayOrderId:   response.razorpay_order_id,
                      razorpayPaymentId: response.razorpay_payment_id,
                      razorpaySignature: response.razorpay_signature,
                    },
                    { headers: this.headers }
                  )
                  .subscribe({
                    next: r => {
                      this._paymentConfirmed.next(r.bill._id);
                      observer.next(r.bill);
                      observer.complete();
                    },
                    error: err => observer.error(err),
                  });
              },
              modal: {
                ondismiss: () => observer.error(new Error('Payment cancelled by user')),
              },
            };

            const rzp = new Razorpay(options);
            rzp.on('payment.failed', (resp: any) => {
              observer.error(new Error(resp.error?.description || 'Payment failed'));
            });
            rzp.open();
          },
          error: err => observer.error(err),
        });
    });
  }

  // ── Totals helper (computed from bills list) ──────────────────────────────

  calcTotals(bills: PatientBill[]): { paid: number; pending: number; total: number } {
    const paid    = bills.filter(b => b.paymentStatus === 'paid').reduce((s, b) => s + b.totalAmount, 0);
    const pending = bills.filter(b => b.paymentStatus === 'pending').reduce((s, b) => s + b.totalAmount, 0);
    return { paid, pending, total: paid + pending };
  }

  // ── UI-only stubs (notifications, chat, reports — no backend endpoint yet) ─

  getTotals(): Observable<{ paid: number; pending: number; total: number }> {
    return this.getBills().pipe(map(bills => this.calcTotals(bills)));
  }

  getNotifications(): Observable<CashierNotification[]> {
    return of([
      { id: 'n1', type: 'payment',     title: 'Payment Confirmed',  message: 'Bill marked as paid.', time: '1 hour ago',  read: false, severity: 'info'     },
      { id: 'n2', type: 'alert',       title: 'Overdue Bill Alert', message: 'A bill is overdue.',   time: '3 hours ago', read: true,  severity: 'critical' },
      { id: 'n3', type: 'maintenance', title: 'Scheduled Maintenance', message: 'System maintenance Sunday 2–4 AM.', time: 'Yesterday', read: true, severity: 'warning' },
    ] as CashierNotification[]).pipe(delay(300));
  }

  getChatContacts(): Observable<CashierChatContact[]> {
    return of([
      { id: 'cc1', name: 'Clinic Admin',  role: 'admin',       online: true,  lastMessage: 'Check pending bills.', unread: 2 },
      { id: 'cc2', name: 'Pharmacist',    role: 'pharmacist',  online: false, lastMessage: 'Medicines ready.',     unread: 0 },
      { id: 'cc3', name: 'Receptionist',  role: 'receptionist',online: true,  lastMessage: 'New patient added.',   unread: 1 },
    ] as CashierChatContact[]).pipe(delay(200));
  }

  getFinancialSummary(): Observable<FinancialSummary[]> {
    return of([
      { month: 'Oct', received: 18400, pending: 3200 },
      { month: 'Nov', received: 22100, pending: 4100 },
      { month: 'Dec', received: 19800, pending: 2900 },
      { month: 'Jan', received: 25600, pending: 5300 },
      { month: 'Feb', received: 23400, pending: 3800 },
      { month: 'Mar', received: 27200, pending: 6100 },
    ] as FinancialSummary[]).pipe(delay(300));
  }
}
