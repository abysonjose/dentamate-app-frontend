import { Component, OnInit } from '@angular/core';
import { trigger, transition, style, animate, query, stagger } from '@angular/animations';
import { LabDataService, MaintenanceNotification } from '../../../../core/services/lab-data.service';
import { SoundService } from '../../../../core/services/sound.service';

@Component({
  selector: 'app-lab-notifications',
  templateUrl: './lab-notifications.component.html',
  styleUrls: ['./lab-notifications.component.scss'],
  animations: [
    trigger('listAnim', [
      transition('* => *', [
        query(':enter', [
          style({ opacity: 0, transform: 'translateX(-10px)' }),
          stagger(60, [animate('250ms ease', style({ opacity: 1, transform: 'translateX(0)' }))])
        ], { optional: true })
      ])
    ])
  ]
})
export class LabNotificationsComponent implements OnInit {
  notifications: MaintenanceNotification[] = [];
  loading = true;

  constructor(private labData: LabDataService, private sound: SoundService) {}

  ngOnInit(): void {
    this.labData.getMaintenanceNotifications().subscribe(n => {
      this.notifications = n;
      this.loading = false;
      if (n.some(x => !x.read)) this.sound.playNotification();
    });
  }

  markRead(id: string): void {
    this.notifications = this.notifications.map(n => n.id === id ? { ...n, read: true } : n);
  }

  markAllRead(): void {
    this.notifications = this.notifications.map(n => ({ ...n, read: true }));
  }

  typeIcon(type: string): string { return { maintenance: '⚙️', update: '🔄', alert: '⚠️' }[type] ?? '🔔'; }

  severityColor(s: string): string {
    return { info: '#60a5fa', warning: '#f59e0b', critical: '#f87171' }[s] ?? '#94a3b8';
  }

  severityBg(s: string): string {
    return { info: 'rgba(96,165,250,0.1)', warning: 'rgba(245,158,11,0.1)', critical: 'rgba(248,113,113,0.1)' }[s] ?? 'rgba(148,163,184,0.1)';
  }

  get unreadCount(): number { return this.notifications.filter(n => !n.read).length; }
}
