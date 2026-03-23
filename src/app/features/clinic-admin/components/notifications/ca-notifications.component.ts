import { Component, OnInit } from '@angular/core';
import { ClinicAdminDataService, AdminNotification } from '../../../../core/services/clinic-admin-data.service';

@Component({
  selector: 'app-ca-notifications',
  templateUrl: './ca-notifications.component.html',
  styleUrls: ['./ca-notifications.component.scss']
})
export class CaNotificationsComponent implements OnInit {
  notifications: AdminNotification[] = [];

  constructor(private data: ClinicAdminDataService) {}

  ngOnInit(): void { this.data.getNotifications().subscribe(n => this.notifications = n); }

  markRead(n: AdminNotification): void { n.read = true; }
  markAllRead(): void { this.notifications.forEach(n => n.read = true); }

  typeIcon(type: string): string {
    const map: Record<string, string> = {
      issue: '🐛', subscription: '💳', maintenance: '🔧', warning: '⚠️', ai: '🤖'
    };
    return map[type] ?? '🔔';
  }

  get unreadCount(): number { return this.notifications.filter(n => !n.read).length; }
}
