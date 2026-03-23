import { Component, OnInit, OnDestroy, ElementRef, ViewChild, AfterViewInit, NgZone } from '@angular/core';
import { ClinicAdminDataService } from '../../../../core/services/clinic-admin-data.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-ca-overview',
  templateUrl: './ca-overview.component.html',
  styleUrls: ['./ca-overview.component.scss']
})
export class CaOverviewComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('apptCanvas') apptCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('revCanvas')  revCanvas!: ElementRef<HTMLCanvasElement>;

  stats = { booked: 0, completed: 0, cancelled: 0, onlineUsers: 0, totalUsers: 0 };
  apptData: any[] = [];
  revData:  any[] = [];
  branches: any[] = [];
  financial = { totalReceived: 0, totalExpenditure: 0, pendingAmount: 0 };
  private subs: Subscription[] = [];

  constructor(private data: ClinicAdminDataService, private ngZone: NgZone) {}

  ngOnInit(): void {
    this.subs.push(this.data.getDailyStats().subscribe(s => this.stats = s));
    this.subs.push(this.data.getAppointmentStats().subscribe(d => { this.apptData = d; this.drawApptChart(); }));
    this.subs.push(this.data.getRevenueStats().subscribe(d => { this.revData = d; this.drawRevChart(); }));
    this.subs.push(this.data.getBranchRevenue().subscribe(b => this.branches = b));
    this.subs.push(this.data.getFinancialSummary().subscribe(f => this.financial = f));
  }

  ngAfterViewInit(): void {
    setTimeout(() => { this.drawApptChart(); this.drawRevChart(); }, 100);
  }

  drawApptChart(): void {
    if (!this.apptCanvas || !this.apptData.length) return;
    const canvas = this.apptCanvas.nativeElement;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const W = canvas.width = canvas.offsetWidth || 600;
    const H = canvas.height = 200;
    ctx.clearRect(0, 0, W, H);
    const pad = { l: 40, r: 20, t: 20, b: 30 };
    const chartW = W - pad.l - pad.r;
    const chartH = H - pad.t - pad.b;
    const maxVal = Math.max(...this.apptData.map((d: any) => d.booked)) * 1.2;
    const step = chartW / (this.apptData.length - 1);

    const drawLine = (key: string, color: string) => {
      ctx.beginPath();
      ctx.strokeStyle = color;
      ctx.lineWidth = 2.5;
      ctx.lineJoin = 'round';
      this.apptData.forEach((d: any, i: number) => {
        const x = pad.l + i * step;
        const y = pad.t + chartH - (d[key] / maxVal) * chartH;
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      });
      ctx.stroke();
      // dots
      this.apptData.forEach((d: any, i: number) => {
        const x = pad.l + i * step;
        const y = pad.t + chartH - (d[key] / maxVal) * chartH;
        ctx.beginPath(); ctx.arc(x, y, 3.5, 0, Math.PI * 2);
        ctx.fillStyle = color; ctx.fill();
      });
    };

    // Grid lines
    ctx.strokeStyle = 'rgba(255,255,255,0.06)'; ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = pad.t + (chartH / 4) * i;
      ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(W - pad.r, y); ctx.stroke();
    }

    drawLine('booked',    '#14b8a6');
    drawLine('completed', '#3b82f6');
    drawLine('cancelled', '#f43f5e');

    // X labels
    ctx.fillStyle = 'rgba(240,253,250,0.45)'; ctx.font = '11px Inter,sans-serif'; ctx.textAlign = 'center';
    this.apptData.forEach((d: any, i: number) => {
      ctx.fillText(d.date, pad.l + i * step, H - 6);
    });
  }

  drawRevChart(): void {
    if (!this.revCanvas || !this.revData.length) return;
    const canvas = this.revCanvas.nativeElement;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const W = canvas.width = canvas.offsetWidth || 600;
    const H = canvas.height = 200;
    ctx.clearRect(0, 0, W, H);
    const pad = { l: 50, r: 20, t: 20, b: 30 };
    const chartW = W - pad.l - pad.r;
    const chartH = H - pad.t - pad.b;
    const maxVal = Math.max(...this.revData.map((d: any) => d.amount)) * 1.15;
    const step = chartW / (this.revData.length - 1);

    // Gradient fill
    const grad = ctx.createLinearGradient(0, pad.t, 0, pad.t + chartH);
    grad.addColorStop(0, 'rgba(20,184,166,0.35)');
    grad.addColorStop(1, 'rgba(20,184,166,0)');
    ctx.beginPath();
    this.revData.forEach((d: any, i: number) => {
      const x = pad.l + i * step;
      const y = pad.t + chartH - (d.amount / maxVal) * chartH;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.lineTo(pad.l + (this.revData.length - 1) * step, pad.t + chartH);
    ctx.lineTo(pad.l, pad.t + chartH);
    ctx.closePath(); ctx.fillStyle = grad; ctx.fill();

    // Line
    ctx.beginPath(); ctx.strokeStyle = '#14b8a6'; ctx.lineWidth = 2.5; ctx.lineJoin = 'round';
    this.revData.forEach((d: any, i: number) => {
      const x = pad.l + i * step;
      const y = pad.t + chartH - (d.amount / maxVal) * chartH;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.stroke();

    // Grid + Y labels
    ctx.strokeStyle = 'rgba(255,255,255,0.06)'; ctx.lineWidth = 1;
    ctx.fillStyle = 'rgba(240,253,250,0.45)'; ctx.font = '10px Inter,sans-serif'; ctx.textAlign = 'right';
    for (let i = 0; i <= 4; i++) {
      const y = pad.t + (chartH / 4) * i;
      ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(W - pad.r, y); ctx.stroke();
      ctx.fillText('₹' + Math.round(maxVal - (maxVal / 4) * i).toLocaleString('en-IN'), pad.l - 4, y + 4);
    }

    // X labels
    ctx.fillStyle = 'rgba(240,253,250,0.45)'; ctx.textAlign = 'center';
    this.revData.forEach((d: any, i: number) => {
      ctx.fillText(d.period, pad.l + i * step, H - 6);
    });
  }

  get maxBranchRev(): number { return Math.max(...this.branches.map(b => b.revenue), 1); }

  ngOnDestroy(): void { this.subs.forEach(s => s.unsubscribe()); }
}
