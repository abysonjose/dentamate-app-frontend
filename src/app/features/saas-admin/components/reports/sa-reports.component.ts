import { Component, OnInit, OnDestroy } from '@angular/core';
import { SaasAdminDataService, ReportItem } from '../../../../core/services/saas-admin-data.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-sa-reports',
  templateUrl: './sa-reports.component.html',
  styleUrls: ['./sa-reports.component.scss']
})
export class SaReportsComponent implements OnInit, OnDestroy {
  reports: ReportItem[] = [];
  filtered: ReportItem[] = [];
  activeType = 'all';
  private subs: Subscription[] = [];

  types = ['all', 'financial', 'system', 'operational', 'resource'];
  typeLabels: Record<string, string> = { all: 'All', financial: 'Financial', system: 'System', operational: 'Operational', resource: 'Resource' };
  typeColors: Record<string, string> = { financial: '#22c55e', system: '#3b82f6', operational: '#f59e0b', resource: '#a855f7' };

  constructor(private data: SaasAdminDataService) {}

  ngOnInit(): void {
    this.subs.push(this.data.getReports().subscribe(r => { this.reports = r; this.applyFilter(); }));
  }

  applyFilter(): void {
    this.filtered = this.activeType === 'all' ? [...this.reports] : this.reports.filter(r => r.type === this.activeType);
  }

  setType(t: string): void { this.activeType = t; this.applyFilter(); }

  getTypeColor(type: string): string { return this.typeColors[type] ?? '#64748b'; }

  ngOnDestroy(): void { this.subs.forEach(s => s.unsubscribe()); }
}
