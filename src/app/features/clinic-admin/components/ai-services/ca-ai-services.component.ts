import { Component, OnInit, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { ClinicAdminDataService } from '../../../../core/services/clinic-admin-data.service';

@Component({
  selector: 'app-ca-ai-services',
  templateUrl: './ca-ai-services.component.html',
  styleUrls: ['./ca-ai-services.component.scss']
})
export class CaAiServicesComponent implements OnInit, AfterViewInit {
  @ViewChild('periodCanvas') periodCanvas!: ElementRef<HTMLCanvasElement>;

  doctors: any[] = [];
  periodStats: any[] = [];
  planLimit = { used: 0, total: 1000 };

  constructor(private data: ClinicAdminDataService) {}

  ngOnInit(): void {
    this.data.getAiCreditUsage().subscribe(d => this.doctors = d);
    this.data.getAiCreditPeriodStats().subscribe(s => { this.periodStats = s; this.drawChart(); });
    this.data.getAiPlanLimit().subscribe(l => this.planLimit = l);
  }

  ngAfterViewInit(): void { setTimeout(() => this.drawChart(), 100); }

  drawChart(): void {
    if (!this.periodCanvas || !this.periodStats.length) return;
    const canvas = this.periodCanvas.nativeElement;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const W = canvas.width = canvas.offsetWidth || 600;
    const H = canvas.height = 180;
    ctx.clearRect(0, 0, W, H);
    const pad = { l: 40, r: 20, t: 20, b: 30 };
    const chartW = W - pad.l - pad.r;
    const chartH = H - pad.t - pad.b;
    const maxVal = Math.max(...this.periodStats.map((d: any) => d.credits)) * 1.2;
    const step = chartW / (this.periodStats.length - 1);

    // Gradient fill
    const grad = ctx.createLinearGradient(0, pad.t, 0, pad.t + chartH);
    grad.addColorStop(0, 'rgba(168,85,247,0.35)');
    grad.addColorStop(1, 'rgba(168,85,247,0)');
    ctx.beginPath();
    this.periodStats.forEach((d: any, i: number) => {
      const x = pad.l + i * step;
      const y = pad.t + chartH - (d.credits / maxVal) * chartH;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.lineTo(pad.l + (this.periodStats.length - 1) * step, pad.t + chartH);
    ctx.lineTo(pad.l, pad.t + chartH);
    ctx.closePath(); ctx.fillStyle = grad; ctx.fill();

    ctx.beginPath(); ctx.strokeStyle = '#a855f7'; ctx.lineWidth = 2.5; ctx.lineJoin = 'round';
    this.periodStats.forEach((d: any, i: number) => {
      const x = pad.l + i * step;
      const y = pad.t + chartH - (d.credits / maxVal) * chartH;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.stroke();

    // Dots
    this.periodStats.forEach((d: any, i: number) => {
      const x = pad.l + i * step;
      const y = pad.t + chartH - (d.credits / maxVal) * chartH;
      ctx.beginPath(); ctx.arc(x, y, 3.5, 0, Math.PI * 2);
      ctx.fillStyle = '#a855f7'; ctx.fill();
    });

    // Grid + labels
    ctx.strokeStyle = 'rgba(255,255,255,0.06)'; ctx.lineWidth = 1;
    ctx.fillStyle = 'rgba(240,253,250,0.45)'; ctx.font = '11px Inter,sans-serif'; ctx.textAlign = 'center';
    this.periodStats.forEach((d: any, i: number) => {
      ctx.fillText(d.period, pad.l + i * step, H - 6);
    });
  }

  get usedPct(): number { return Math.round((this.planLimit.used / this.planLimit.total) * 100); }
  get maxDoctorCredits(): number { return Math.max(...this.doctors.map(d => d.credits), 1); }
}
