import { Component, OnInit } from '@angular/core';
import { trigger, transition, style, animate, query, stagger } from '@angular/animations';
import { ReceptionistDataService, Notification } from '../../../../core/services/receptionist-data.service';
import { SoundService } from '../../../../core/services/sound.service';

@Component({
  selector: 'app-rec-notifications',
  templateUrl: './rec-notifications.component.html',
  styleUrls: ['./rec-notifications.component.scss'],
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
export class RecNotificationsComponent implements OnInit {
  notifications: Notification[] = [];
  loading = true;

  constructor(private data: ReceptionistDataService, private sound: SoundService) {}

  ngOnInit(): void {
    this.data.getNotifications().subscribe(n => {
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

  typeIcon(type: string): string { return { registration: '👤', maintenance: '⚙️', info: 'ℹ️' }[type] ?? '🔔'; }
  typeColor(type: string): string { return { registration: '#60a5fa', maintenance: '#f59e0b', info: '#a855f7' }[type] ?? '#94a3b8'; }

  get unreadCount(): number { return this.notifications.filter(n => !n.read).length; }
}
