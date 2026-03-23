import { Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewInit, NgZone } from '@angular/core';
import { SaasAdminDataService, SystemMetric, ServerNode } from '../../../../core/services/saas-admin-data.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-sa-overview',
  templateUrl: './sa-overview.component.html',
  styleUrls: ['./sa-overview.component.scss']
})
export class SaOverviewComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('perfCanvas')    perfCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('latencyCanvas') latencyCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('loadCanvas')    loadCanvas!: ElementRef<HTMLCanvasElement>;

  overview = { totalClinics: 0, totalUsers: 0, onlineUsers: 0, activeServers: 0, maxServers: 10, uptime: 99.97 };
  metrics: SystemMetric[] = [];
  servers: ServerNode[] = [];
  onlineUsers = 0;
  private subs: Subscription[] = [];

  constructor(private data: SaasAdminDataService, private ngZone: NgZone) {}

  ngOnInit(): void {
    this.subs.push(this.data.getSystemOverview().subscribe(o => this.overview = o));
    this.subs.push(this.data.metrics$.subscribe(m => {
      this.metrics = m;
      this.ngZone.run(() => { this.drawPerfChart(); this.drawLatencyChart(); this.drawLoadChart(); });
    }));
    this.subs.push(this.data.servers$.subscribe(s => this.servers = s));
    this.subs.push(this.data.onlineUsers$.subscribe(u => this.onlineUsers = u));
  }

  ngAfterViewInit(): void {
    setTimeout(() => { this.drawPerfChart(); this.drawLatencyChart(); this.drawLoadChart(); }, 150);
  }

  private drawLineChart(canvas: HTMLCanvasElement, values: number[], color: string, maxVal: number, label: string): void {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const W = canvas.width = canvas.offsetWidth || 400;
    const H = canvas.height = 120;
    ctx.clearRect(0, 0, W, H);
    if (values.length < 2) return;
    const pad = { l: 8, r: 8, t: 10, b: 8 };
    const cW = W - pad.l - pad.r;
    const cH = H - pad.t - pad.b;
    const step = cW / (values.length - 1);

    // Gradient fill
    const grad = ctx.createLinearGradient(0, pad.t, 0, pad.t + cH);
    grad.addColorStop(0, color + '55');
    grad.addColorStop(1, color + '00');
    ctx.beginPath();
    values.forEach((v, i) => {
      const x = pad.l + i * step;
      const y = pad.t + cH - (v / maxVal) * cH;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.lineTo(pad.l + (values.length - 1) * step, pad.t + cH);
    ctx.lineTo(pad.l, pad.t + cH);
    ctx.closePath(); ctx.fillStyle = grad; ctx.fill();

    // Line
    ctx.beginPath(); ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.lineJoin = 'round';
    values.forEach((v, i) => {
      const x = pad.l + i * step;
      const y = pad.t + cH - (v / maxVal) * cH;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.stroke();

    // Last value dot
    const lastX = pad.l + (values.length - 1) * step;
    const lastY = pad.t + cH - (values[values.length - 1] / maxVal) * cH;
    ctx.beginPath(); ctx.arc(lastX, lastY, 4, 0, Math.PI * 2);
    ctx.fillStyle = color; ctx.fill();
  }

  drawPerfChart(): void {
    if (!this.perfCanvas || !this.metrics.length) return;
    this.drawLineChart(this.perfCanvas.nativeElement, this.metrics.map(m => m.cpu), '#a855f7', 100, 'CPU');
  }

  drawLatencyChart(): void {
    if (!this.latencyCanvas || !this.metrics.length) return;
    this.drawLineChart(this.latencyCanvas.nativeElement, this.metrics.map(m => m.latency), '#f59e0b', 200, 'Latency');
  }

  drawLoadChart(): void {
    if (!this.loadCanvas || !this.metrics.length) return;
    this.drawLineChart(this.loadCanvas.nativeElement, this.metrics.map(m => m.load), '#3b82f6', 100, 'Load');
  }

  getServerStatusColor(status: string): string {
    return status === 'healthy' ? '#22c55e' : status === 'warning' ? '#f59e0b' : '#ef4444';
  }

  get latestMetric(): SystemMetric | null { return this.metrics[this.metrics.length - 1] ?? null; }

  ngOnDestroy(): void { this.subs.forEach(s => s.unsubscribe()); }
}
