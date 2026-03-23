import { Component } from '@angular/core';
import { trigger, transition, style, animate, query, stagger } from '@angular/animations';
import { LabDataService, LabReportHistory } from '../../../../core/services/lab-data.service';
import { SoundService } from '../../../../core/services/sound.service';

@Component({
  selector: 'app-lab-report-history',
  templateUrl: './lab-report-history.component.html',
  styleUrls: ['./lab-report-history.component.scss'],
  animations: [
    trigger('listAnim', [
      transition('* => *', [
        query(':enter', [
          style({ opacity: 0, transform: 'translateY(10px)' }),
          stagger(50, [animate('250ms ease', style({ opacity: 1, transform: 'translateY(0)' }))])
        ], { optional: true })
      ])
    ])
  ]
})
export class LabReportHistoryComponent {
  searchId = '';
  reports: LabReportHistory[] = [];
  loading = false;
  searched = false;
  patientName = '';

  constructor(private labData: LabDataService, private sound: SoundService) {}

  search(): void {
    const id = this.searchId.trim();
    if (!id) return;
    this.loading = true;
    this.searched = false;
    this.labData.getReportHistory(id).subscribe(r => {
      this.reports = r;
      this.patientName = r[0]?.patientName ?? '';
      this.loading = false;
      this.searched = true;
      this.sound.playSuccess();
    });
  }

  print(): void { window.print(); }

  groupByDate(): { date: string; reports: LabReportHistory[] }[] {
    const map = new Map<string, LabReportHistory[]>();
    this.reports.forEach(r => {
      const d = r.date;
      if (!map.has(d)) map.set(d, []);
      map.get(d)!.push(r);
    });
    return Array.from(map.entries())
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([date, reports]) => ({ date, reports }));
  }

  getInitials(name: string): string {
    return name.split(' ').filter(Boolean).map(w => w[0]).join('').slice(0, 2).toUpperCase();
  }

  formatDate(d: string): string {
    return new Date(d + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'long', day: 'numeric' });
  }
}
