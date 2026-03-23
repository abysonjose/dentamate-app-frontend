import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ReceptionistDataService, CashPayment } from '../../../../core/services/receptionist-data.service';
import { SoundService } from '../../../../core/services/sound.service';

@Component({
  selector: 'app-rec-cash-collection',
  templateUrl: './cash-collection.component.html',
  styleUrls: ['./cash-collection.component.scss']
})
export class CashCollectionComponent implements OnInit {
  payments: CashPayment[] = [];
  loading = true;
  payForm!: FormGroup;
  showSuccess = false;

  constructor(private data: ReceptionistDataService, private fb: FormBuilder, private sound: SoundService) {}

  ngOnInit(): void {
    this.data.getCashPayments().subscribe(p => { this.payments = p; this.loading = false; });
    this.payForm = this.fb.group({
      patientName: ['', Validators.required],
      patientId:   [''],
      service:     ['', Validators.required],
      amount:      ['', [Validators.required, Validators.min(1)]],
      method:      ['cash', Validators.required]
    });
  }

  recordPayment(): void {
    if (this.payForm.invalid) { this.payForm.markAllAsTouched(); return; }
    const v = this.payForm.value;
    const newPayment: CashPayment = {
      id: 'c' + Date.now(), patientName: v.patientName, patientId: v.patientId || 'Walk-in',
      amount: +v.amount, service: v.service,
      time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      method: v.method
    };
    this.payments = [newPayment, ...this.payments];
    this.payForm.reset({ method: 'cash' });
    this.showSuccess = true;
    this.sound.playSuccess();
    setTimeout(() => this.showSuccess = false, 3000);
  }

  get totalToday(): number { return this.payments.reduce((s, p) => s + p.amount, 0); }

  methodIcon(m: string): string { return { cash: '💵', card: '💳', upi: '📱' }[m] ?? '💰'; }
}
