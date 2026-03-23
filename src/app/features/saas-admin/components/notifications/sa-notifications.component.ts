import { Component, OnInit, OnDestroy } from '@angular/core';
import { SaasAdminDataService, SaasNotification } from '../../../../core/services/saas-admin-data.service';
import { SoundService } from '../../../../core/services/sound.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-sa-notifications',
  templateUrl: './sa-notifications.component.html',
  styleUrls: ['./sa-notifications.component.scss']
})
export class SaNotificationsComponent implements OnInit, OnDestroy {
  notifications: SaasNotification[] = [];
  filtered: SaasNotification[] = [];
  activeFilter = 'all';
  private subs: Subscription[] = [];

  filters = ['all', 'issue', 'new_sub', 'cancel', 'security', 'maintenance'];
  filterLabels: Record<string, string> = { all: 'All', issue: 'Issues', new_sub: 'New Subs', cancel: 'Cancellations', security: 'Security', maintenance: 'Maintenance' };

  constructor(private data: SaasAdminDataService, private sound: SoundService) {}

  ngOnInit(): void {
    this.subs.push(this.data.getNotifications().subscribe(n => { this.notifications = n; this.applyFilter(); }));
  }

  applyFilter(): void {
    this.filtered = this.activeFilter === 'all' ? [...this.notifications] : this.notifications.filter(n => n.type === this.activeFilter);
  }

  setFilter(f: string): void { this.activeFilter = f; this.applyFilter(); }

  markRead(n: SaasNotification): void {
    this.data.markNotificationRead(n.id).subscribe(() => { n.read = true; });
  }

  markAllRead(): void {
    this.notifications.forEach(n => { n.read = true; this.data.markNotificationRead(n.id).subscribe(); });
    this.sound.playSuccess();
  }

  getSeverityColor(s: string): string {
    return s === 'critical' ? '#ef4444' : s === 'warning' ? '#f59e0b' : '#3b82f6';
  }

  getTypeIcon(type: string): string {
    const map: Record<string, string> = { issue: '🔧', new_sub: '✅', cancel: '❌', security: '🔒', maintenance: '🛠' };
    return map[type] ?? '📢';
  }

  get unreadCount(): number { return this.notifications.filter(n => !n.read).length; }

  ngOnDestroy(): void { this.subs.forEach(s => s.unsubscribe()); }
}
