import { Component, OnInit, OnDestroy } from '@angular/core';
import { trigger, transition, style, animate, query, stagger } from '@angular/animations';
import { interval, Subscription } from 'rxjs';

export type NotifType = 'lab' | 'maintenance' | 'appointment' | 'system' | 'leave' | 'report';
export type NotifPriority = 'high' | 'medium' | 'low';

export interface DocNotification {
  id: string;
  type: NotifType;
  priority: NotifPriority;
  title: string;
  message: string;
  time: string;
  timestamp: Date;
  read: boolean;
  actionLabel?: string;
  actionId?: string;
  patientName?: string;
  patientId?: string;
}

@Component({
  selector: 'app-doc-notifications',
  templateUrl: './doc-notifications.component.html',
  styleUrls: ['./doc-notifications.component.scss'],
  animations: [
    trigger('listAnim', [
      transition('* => *', [
        query(':enter', [
          style({ opacity: 0, transform: 'translateY(12px)' }),
          stagger(50, [animate('280ms ease', style({ opacity: 1, transform: 'translateY(0)' }))])
        ], { optional: true })
      ])
    ]),
    trigger('slideIn', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateX(16px)' }),
        animate('250ms ease', style({ opacity: 1, transform: 'translateX(0)' }))
      ]),
      transition(':leave', [
        animate('180ms ease', style({ opacity: 0, transform: 'translateX(16px)' }))
      ])
    ])
  ]
})
export class DocNotificationsComponent implements OnInit, OnDestroy {

  activeFilter: NotifType | 'all' = 'all';
  notifications: DocNotification[] = [];
  private sub!: Subscription;

  filters: { id: NotifType | 'all'; label: string }[] = [
    { id: 'all',         label: 'All'          },
    { id: 'lab',         label: 'Lab Reports'  },
    { id: 'appointment', label: 'Appointments' },
    { id: 'leave',       label: 'Leave'        },
    { id: 'maintenance', label: 'Maintenance'  },
    { id: 'system',      label: 'System'       },
  ];

  private mockData: DocNotification[] = [
    {
      id: 'n1', type: 'lab', priority: 'high',
      title: 'Lab Report Ready',
      message: 'Blood panel results for Aisha Rahman (DM-001) are now available. Review before consultation.',
      time: '2 min ago', timestamp: new Date(Date.now() - 2 * 60000),
      read: false, actionLabel: 'View Report', actionId: 'lab-n1',
      patientName: 'Aisha Rahman', patientId: 'DM-001'
    },
    {
      id: 'n2', type: 'lab', priority: 'high',
      title: 'Lab Report Ready',
      message: 'OPG X-ray scan for Carlos Mendez (DM-002) has been uploaded by the Lab Manager.',
      time: '18 min ago', timestamp: new Date(Date.now() - 18 * 60000),
      read: false, actionLabel: 'View Report', actionId: 'lab-n2',
      patientName: 'Carlos Mendez', patientId: 'DM-002'
    },
    {
      id: 'n3', type: 'appointment', priority: 'medium',
      title: 'Appointment Rescheduled',
      message: 'Priya Sharma (DM-003) has accepted the rescheduled appointment for tomorrow at 10:30 AM.',
      time: '35 min ago', timestamp: new Date(Date.now() - 35 * 60000),
      read: false, actionLabel: 'View Queue', actionId: 'queue',
      patientName: 'Priya Sharma', patientId: 'DM-003'
    },
    {
      id: 'n4', type: 'appointment', priority: 'medium',
      title: 'Appointment Cancelled',
      message: 'James Okafor (DM-004) has cancelled his appointment for today. Token DM-004 removed from queue.',
      time: '1 hr ago', timestamp: new Date(Date.now() - 60 * 60000),
      read: true, patientName: 'James Okafor', patientId: 'DM-004'
    },
    {
      id: 'n5', type: 'leave', priority: 'high',
      title: 'Leave Request Approved',
      message: 'Your leave request for March 20, 2026 has been approved by Clinic Admin. 6 patients have been notified and rescheduled.',
      time: '2 hr ago', timestamp: new Date(Date.now() - 2 * 3600000),
      read: true, actionLabel: 'View Details', actionId: 'queue'
    },
    {
      id: 'n6', type: 'lab', priority: 'medium',
      title: 'CBCT Scan Completed',
      message: 'Cone-Beam CT scan for Mei Lin (DM-005) is ready. Results show periapical lesion on tooth #36.',
      time: '3 hr ago', timestamp: new Date(Date.now() - 3 * 3600000),
      read: true, actionLabel: 'View Report', actionId: 'lab-n6',
      patientName: 'Mei Lin', patientId: 'DM-005'
    },
    {
      id: 'n7', type: 'maintenance', priority: 'low',
      title: 'Scheduled Maintenance',
      message: 'DentaMate system maintenance is scheduled for Sunday, March 22 from 2:00 AM – 4:00 AM. Services may be temporarily unavailable.',
      time: '5 hr ago', timestamp: new Date(Date.now() - 5 * 3600000),
      read: true
    },
    {
      id: 'n8', type: 'system', priority: 'low',
      title: 'AI Credits Usage Alert',
      message: 'You have used 78% of your monthly AI diagnosis credits (156/200). Contact Clinic Admin to increase the limit.',
      time: 'Yesterday', timestamp: new Date(Date.now() - 24 * 3600000),
      read: true, actionLabel: 'View Usage', actionId: 'ai'
    },
    {
      id: 'n9', type: 'appointment', priority: 'low',
      title: 'New Appointment Booked',
      message: 'David Osei (DM-006) has booked an appointment for today at 3:00 PM. Token DM-006 added to queue.',
      time: 'Yesterday', timestamp: new Date(Date.now() - 26 * 3600000),
      read: true, patientName: 'David Osei', patientId: 'DM-006'
    },
    {
      id: 'n10', type: 'system', priority: 'medium',
      title: 'Password Change Required',
      message: 'Your account password has not been changed in 90 days. Please update it from your profile settings.',
      time: '2 days ago', timestamp: new Date(Date.now() - 2 * 24 * 3600000),
      read: true, actionLabel: 'Change Password', actionId: 'settings'
    },
  ];

  ngOnInit(): void {
    this.notifications = [...this.mockData];
    // Simulate a new lab report arriving after 8s
    this.sub = interval(8000).subscribe(() => this.injectLiveNotif());
  }

  private injected = false;
  private injectLiveNotif(): void {
    if (this.injected) return;
    this.injected = true;
    const live: DocNotification = {
      id: 'live1', type: 'lab', priority: 'high',
      title: 'Lab Report Ready — LIVE',
      message: 'Periapical X-ray for Aisha Rahman (DM-001) just uploaded by Lab Manager.',
      time: 'Just now', timestamp: new Date(),
      read: false, actionLabel: 'View Report', actionId: 'lab-live1',
      patientName: 'Aisha Rahman', patientId: 'DM-001'
    };
    this.notifications = [live, ...this.notifications];
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  get filtered(): DocNotification[] {
    return this.activeFilter === 'all'
      ? this.notifications
      : this.notifications.filter(n => n.type === this.activeFilter);
  }

  get unreadCount(): number { return this.notifications.filter(n => !n.read).length; }

  countByType(type: NotifType | 'all'): number {
    return type === 'all' ? this.notifications.length : this.notifications.filter(n => n.type === type).length;
  }

  markRead(n: DocNotification): void { n.read = true; }

  markAllRead(): void { this.notifications.forEach(n => n.read = true); }

  dismiss(id: string): void { this.notifications = this.notifications.filter(n => n.id !== id); }

  dismissAll(): void {
    this.notifications = this.notifications.filter(n => !n.read);
  }

  typeIcon(type: NotifType): string {
    const icons: Record<NotifType, string> = {
      lab:         `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v11m0 0l-4 7h14l-4-7M9 14h6"/></svg>`,
      appointment: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`,
      maintenance: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>`,
      system:      `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`,
      leave:       `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>`,
      report:      `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>`,
    };
    return icons[type] ?? icons['system'];
  }

  typeColor(type: NotifType): string {
    return {
      lab:         '#60a5fa',
      appointment: '#4ade80',
      maintenance: '#f59e0b',
      system:      '#a855f7',
      leave:       '#f87171',
      report:      '#14b8a6',
    }[type] ?? '#94a3b8';
  }

  priorityDot(p: NotifPriority): string {
    return { high: '#f87171', medium: '#fbbf24', low: '#4ade80' }[p];
  }

  ngOnDestroy(): void { this.sub?.unsubscribe(); }
}
