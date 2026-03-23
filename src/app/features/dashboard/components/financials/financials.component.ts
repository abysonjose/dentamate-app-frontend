import { Component, Input, OnInit } from '@angular/core';
import { DashboardDataService, Bill } from '../../../../core/services/dashboard-data.service';
import { trigger, transition, style, animate } from '@angular/animations';

@Component({
  selector: 'app-financials',
  templateUrl: './financials.component.html',
  styleUrls: ['./financials.component.scss'],
  animations: [
    trigger('fadeSlide', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(8px)' }),
        animate('300ms ease', style({ opacity: 1, transform: 'translateY(0)' }))
      ])
    ])
  ]
})
export class FinancialsComponent implements OnInit {
  @Input() fullView = false;
  bills: Bill[] = [];
  loading = true;
  payingId: string | null = null;

  constructor(private data: DashboardDataService) {}

  ngOnInit(): void {
    this.data.getBills().subscribe(b => { this.bills = b; this.loading = false; });
  }

  get outstanding(): number {
    return this.bills.filter(b => !b.paid).reduce((s, b) => s + b.amount, 0);
  }

  pay(bill: Bill): void {
    this.payingId = bill.id;
    setTimeout(() => { bill.paid = true; this.payingId = null; }, 1200);
  }
}
