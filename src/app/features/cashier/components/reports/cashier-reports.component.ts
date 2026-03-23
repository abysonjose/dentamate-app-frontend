import { Component, OnInit } from '@angular/core';
import { trigger, transition, style, animate, query, stagger } from '@angular/animations';
import { CashierDataService, FinancialSummary } from '../../../../core/services/cashier-data.service';

@Component({
  selector: 'app-cashier-reports',
  templateUrl: './cashier-reports.component.html',
  styleUrls: ['./cashier-reports.component.scss'],
  animations: [
    trigger('stagger', [
      transition(':enter', [
        query('.report-card', [
          style({ opacity: 0, transform: 'translateY(16px)' }),
          stagger(80, [animate('320ms cubic-bezier(0.35,0,0.25,1)', style({ opacity: 1, transform: 'translateY(0)' }))])
        ], { optional: true })
      ])
    ])
  ]
})
export class CashierReportsComponent implements OnInit {
  summary: FinancialSummary[] = [];
  loading = true;
  activeChart: 'bar' | 'line' = 'bar';

  // Chart dimensions
  readonly chartW = 560;
  readonly chartH = 200;
  readonly padL = 48;
  readonly padB = 32;
  readonly padT = 16;
  readonly padR = 16;

  constructor(private cashierData: CashierDataService) {}

  ngOnInit(): void {
    this.cashierData.getFinancialSummary().subscribe(s => {
      this.summary = s;
      this.loading = false;
    });
  }

  get maxVal(): number {
    return Math.max(...this.summary.map(s => s.received + s.pending), 1);
  }

  get innerW(): number { return this.chartW - this.padL - this.padR; }
  get innerH(): number { return this.chartH - this.padT - this.padB; }

  barX(i: number, offset: 0 | 1): number {
    const slotW = this.innerW / this.summary.length;
    const barW = slotW * 0.35;
    return this.padL + i * slotW + slotW * 0.1 + offset * (barW + 2);
  }

  barW(): number {
    const slotW = this.innerW / this.summary.length;
    return slotW * 0.35;
  }

  barH(val: number): number { return (val / this.maxVal) * this.innerH; }
  barY(val: number): number { return this.padT + this.innerH - this.barH(val); }

  labelX(i: number): number {
    const slotW = this.innerW / this.summary.length;
    return this.padL + i * slotW + slotW / 2;
  }

  // Line chart points
  linePoints(key: 'received' | 'pending'): string {
    return this.summary.map((s, i) => {
      const x = this.padL + (i / (this.summary.length - 1)) * this.innerW;
      const y = this.padT + this.innerH - (s[key] / this.maxVal) * this.innerH;
      return `${x},${y}`;
    }).join(' ');
  }

  linePoint(i: number, key: 'received' | 'pending'): { x: number; y: number } {
    const x = this.padL + (i / (this.summary.length - 1)) * this.innerW;
    const y = this.padT + this.innerH - (this.summary[i][key] / this.maxVal) * this.innerH;
    return { x, y };
  }

  yLabels(): { val: number; y: number }[] {
    const steps = 4;
    return Array.from({ length: steps + 1 }, (_, i) => {
      const val = (this.maxVal / steps) * i;
      const y = this.padT + this.innerH - (val / this.maxVal) * this.innerH;
      return { val, y };
    });
  }

  get totalReceived(): number { return this.summary.reduce((s, m) => s + m.received, 0); }
  get totalPending():  number { return this.summary.reduce((s, m) => s + m.pending, 0); }
  get collectionRate(): number {
    const total = this.totalReceived + this.totalPending;
    return total ? Math.round((this.totalReceived / total) * 100) : 0;
  }

  formatK(val: number): string {
    return val >= 1000 ? `$${(val / 1000).toFixed(0)}k` : `$${val}`;
  }
}
