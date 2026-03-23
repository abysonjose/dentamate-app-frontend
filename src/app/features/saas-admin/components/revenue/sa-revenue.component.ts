import { Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { SaasAdminDataService, RevenuePoint, PlanDistribution, FinancialSummary } from '../../../../core/services/saas-admin-data.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-sa-revenue',
  templateUrl: './sa-revenue.component.html',
  styleUrls: ['./sa-revenue.component.scss']
})
export class SaRevenueComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('revCanvas')  revCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('planCanvas') planCanvas!: ElementRef<HTMLCanvasElement>;

  revenue: RevenuePoint[] = [];
  plans: PlanDistribution[] = [];
  financial: FinancialSummary = { serverCost: 0, pendingAmount: 0, receivedAmount: 0, totalRevenue: 0 };
  private subs: Subscription[] = [];

  constructor(private data: SaasAdminDataService) {}

  ngOnInit(): void {
    this.subs.push(this.data.getRevenueTimeline().subscribe(r => { this.revenue = r; this.drawRevChart(); }));
    this.subs.push(this.data.getPlanDistribution().subscribe(p => { this.plans = p; this.drawPlanChart(); }));
    this.subs.push(this.data.getFinancialSummary().subscribe(f => this.financial = f));
  }

  ngAfterViewInit(): void {
    setTimeout(() => { this.drawRevChart(); this.drawPlanChart(); }, 150);
  }

  drawRevChart(): void {
    if (!this.revCanvas || !this.revenue.length) return;
    const canvas = this.revCanvas.nativeElement;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const W = canvas.width = canvas.offsetWidth || 600;
    const H = canvas.height = 220;
    ctx.clearRect(0, 0, W, H);
    const pad = { l: 60, r: 20, t: 20, b: 30 };
    const cW = W - pad.l - pad.r;
    const cH = H - pad.t - pad.b;
    const maxVal = Math.max(...this.revenue.map(d => d.amount)) * 1.15;
    const step = cW / (this.revenue.length - 1);

    // Grid
    ctx.strokeStyle = 'rgba(255,255,255,0.06)'; ctx.lineWidth = 1;
    ctx.fillStyle = 'rgba(240,253,250,0.35)'; ctx.font = '10px Inter,sans-serif'; ctx.textAlign = 'right';
    for (let i = 0; i <= 4; i++) {
      const y = pad.t + (cH / 4) * i;
      ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(W - pad.r, y); ctx.stroke();
      ctx.fillText('₹' + Math.round(maxVal - (maxVal / 4) * i).toLocaleString('en-IN'), pad.l - 4, y + 4);
    }

    // Gradient fill
    const grad = ctx.createLinearGradient(0, pad.t, 0, pad.t + cH);
    grad.addColorStop(0, 'rgba(168,85,247,0.35)');
    grad.addColorStop(1, 'rgba(168,85,247,0)');
    ctx.beginPath();
    this.revenue.forEach((d, i) => {
      const x = pad.l + i * step;
      const y = pad.t + cH - (d.amount / maxVal) * cH;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.lineTo(pad.l + (this.revenue.length - 1) * step, pad.t + cH);
    ctx.lineTo(pad.l, pad.t + cH);
    ctx.closePath(); ctx.fillStyle = grad; ctx.fill();

    // Line
    ctx.beginPath(); ctx.strokeStyle = '#a855f7'; ctx.lineWidth = 2.5; ctx.lineJoin = 'round';
    this.revenue.forEach((d, i) => {
      const x = pad.l + i * step;
      const y = pad.t + cH - (d.amount / maxVal) * cH;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.stroke();

    // Dots + X labels
    ctx.fillStyle = 'rgba(240,253,250,0.45)'; ctx.textAlign = 'center';
    this.revenue.forEach((d, i) => {
      const x = pad.l + i * step;
      const y = pad.t + cH - (d.amount / maxVal) * cH;
      ctx.beginPath(); ctx.arc(x, y, 3.5, 0, Math.PI * 2);
      ctx.fillStyle = '#a855f7'; ctx.fill();
      ctx.fillStyle = 'rgba(240,253,250,0.45)';
      ctx.fillText(d.period, x, H - 6);
    });
  }

  drawPlanChart(): void {
    if (!this.planCanvas || !this.plans.length) return;
    const canvas = this.planCanvas.nativeElement;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const W = canvas.width = canvas.offsetWidth || 400;
    const H = canvas.height = 220;
    ctx.clearRect(0, 0, W, H);
    const pad = { l: 40, r: 20, t: 20, b: 40 };
    const cW = W - pad.l - pad.r;
    const cH = H - pad.t - pad.b;
    const maxVal = Math.max(...this.plans.map(p => p.count)) * 1.2;
    const barW = (cW / this.plans.length) * 0.55;
    const gap = cW / this.plans.length;

    // Grid
    ctx.strokeStyle = 'rgba(255,255,255,0.06)'; ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = pad.t + (cH / 4) * i;
      ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(W - pad.r, y); ctx.stroke();
    }

    this.plans.forEach((p, i) => {
      const x = pad.l + i * gap + (gap - barW) / 2;
      const barH = (p.count / maxVal) * cH;
      const y = pad.t + cH - barH;

      // Bar gradient
      const grad = ctx.createLinearGradient(0, y, 0, y + barH);
      grad.addColorStop(0, p.color);
      grad.addColorStop(1, p.color + '66');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.roundRect(x, y, barW, barH, [6, 6, 0, 0]);
      ctx.fill();

      // Count label
      ctx.fillStyle = p.color; ctx.font = 'bold 12px Inter,sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(String(p.count), x + barW / 2, y - 6);

      // Plan label
      ctx.fillStyle = 'rgba(240,253,250,0.55)'; ctx.font = '11px Inter,sans-serif';
      ctx.fillText(p.plan, x + barW / 2, H - 10);
    });
  }

  get netProfit(): number { return this.financial.receivedAmount - this.financial.serverCost; }

  ngOnDestroy(): void { this.subs.forEach(s => s.unsubscribe()); }
}
