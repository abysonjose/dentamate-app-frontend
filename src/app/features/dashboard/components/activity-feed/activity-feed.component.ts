import { Component, Input, OnInit } from '@angular/core';
import { trigger, transition, style, animate, query, stagger } from '@angular/animations';
import { DashboardDataService, ActivityItem } from '../../../../core/services/dashboard-data.service';

@Component({
  selector: 'app-activity-feed',
  templateUrl: './activity-feed.component.html',
  styleUrls: ['./activity-feed.component.scss'],
  animations: [
    trigger('feedAnim', [
      transition('* => *', [
        query(':enter', [
          style({ opacity: 0, transform: 'translateX(-10px)' }),
          stagger(80, [animate('260ms ease', style({ opacity: 1, transform: 'translateX(0)' }))])
        ], { optional: true })
      ])
    ])
  ]
})
export class ActivityFeedComponent implements OnInit {
  @Input() fullView = false;
  items: ActivityItem[] = [];
  loading = true;

  constructor(private data: DashboardDataService) {}

  ngOnInit(): void {
    this.data.getActivity().subscribe(a => { this.items = a; this.loading = false; });
  }

  get displayed(): ActivityItem[] {
    return this.fullView ? this.items : this.items.slice(0, 3);
  }

  typeColor(type: string): string {
    return { success: '#4ade80', warning: '#fbbf24', info: '#60a5fa' }[type] ?? '#60a5fa';
  }
}
