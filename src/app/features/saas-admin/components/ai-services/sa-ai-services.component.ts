import { Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { SaasAdminDataService, AiClinicUsage, AiPeriodStat } from '../../../../core/services/saas-admin-data.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-sa-ai-services',
  templateUrl: './sa-ai-services.component.html',
  styleUrls: ['./sa-ai-services.component.scss']
})
export class SaAiServicesComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('periodCanvas') periodCanvas!: ElementRef<HTMLCanvasElement>;

  clinicUsage: AiClinicUsage[] = [];
  periodStats: AiPeriodStat[] = [];
  totalCredits = 0;
  private subs: Subscription[] = [];

  constructor(private data: SaasAdminDataService) {}

  ngOnInit(): void {
    this.subs.push(this.data.getAiClinicUsage().subscribe(u => {
      this.clinicUsage = u;
      this.totalCredits = u.reduce((s, c) => s + c.credits, 0);
    }));
    this.subs.push(this.data.getAiPeriodStats().subscribe(p => { this.periodStats = p; this.drawPeriodChart(); }));
  }

  ngAfterViewInit(): void { setTimeout(() => this.drawPeriodChart(), 150); }

  drawPeriodChart(): void {
    if (!this.periodCanvas || !this.periodStats.length) return;
    const canvas = this.periodCanvas.nativeElement;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const W = canvas.width = canvas.offsetWidth || 600;
    const H = canvas.height = 200;
    ctx.clearRect(0, 0, W, H);
    const pad = { l: 55, r: 20, t: 20, b: 30 };
    const cW = W - pad.l - pad.r;
    const cH = H - pad.t - pad.b;
    const maxVal = Math.max(...this.periodStats.map(d => d.credits)) * 1.2;
    const step = cW / (this.periodStats.length - 1);

    // Grid
    ctx.strokeStyle = 'rgba(255,255,255,0.06)'; ctx.lineWidth = 1;
    ctx.fillStyle = 'rgba(240,253,250,0.35)'; ctx.font = '10px Inter,sans-serif'; ctx.textAlign = 'right';
    for (let i = 0; i <= 4; i++) {
      const y = pad.t + (cH / 4) * i;
      ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(W - pad.r, y); ctx.stroke();
      ctx.fillText(Math.round(maxVal - (maxVal / 4) * i).toLocaleString(), pad.l - 4, y + 4);
    }

    // Gradient fill
    const grad = ctx.createLinearGradient(0, pad.t, 0, pad.t + cH);
    grad.addColorStop(0, 'rgba(168,85,247,0.4)');
    grad.addColorStop(1, 'rgba(168,85,247,0)');
    ctx.beginPath();
    this.periodStats.forEach((d, i) => {
      const x = pad.l + i * step;
      const y = pad.t + cH - (d.credits / maxVal) * cH;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.lineTo(pad.l + (this.periodStats.length - 1) * step, pad.t + cH);
    ctx.lineTo(pad.l, pad.t + cH);
    ctx.closePath(); ctx.fillStyle = grad; ctx.fill();

    // Line
    ctx.beginPath(); ctx.strokeStyle = '#a855f7'; ctx.lineWidth = 2.5; ctx.lineJoin = 'round';
    this.periodStats.forEach((d, i) => {
      const x = pad.l + i * step;
      const y = pad.t + cH - (d.credits / maxVal) * cH;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.stroke();

    // Dots + X labels
    ctx.fillStyle = 'rgba(240,253,250,0.45)'; ctx.textAlign = 'center';
    this.periodStats.forEach((d, i) => {
      const x = pad.l + i * step;
      const y = pad.t + cH - (d.credits / maxVal) * cH;
      ctx.beginPath(); ctx.arc(x, y, 3.5, 0, Math.PI * 2);
      ctx.fillStyle = '#a855f7'; ctx.fill();
      ctx.fillStyle = 'rgba(240,253,250,0.45)';
      ctx.fillText(d.period, x, H - 6);
    });
  }

  getUsagePct(u: AiClinicUsage): number { return Math.min(100, (u.credits / u.limit) * 100); }
  getUsageColor(pct: number): string { return pct > 80 ? '#ef4444' : pct > 60 ? '#f59e0b' : '#a855f7'; }

  ngOnDestroy(): void { this.subs.forEach(s => s.unsubscribe()); }
}
