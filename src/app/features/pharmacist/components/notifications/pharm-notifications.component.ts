import { Component, OnInit } from "@angular/core";
import { PharmacistDataService, PharmacyNotification } from "../../../../core/services/pharmacist-data.service";

@Component({
  selector: "app-pharm-notifications",
  templateUrl: "./pharm-notifications.component.html",
  styleUrls: ["./pharm-notifications.component.scss"]
})
export class PharmNotificationsComponent implements OnInit {
  notifications: PharmacyNotification[] = [];

  constructor(private pharmData: PharmacistDataService) {}

  ngOnInit(): void { this.pharmData.getNotifications().subscribe(n => this.notifications = n); }

  markRead(n: PharmacyNotification): void { n.read = true; }
  markAllRead(): void { this.notifications.forEach(n => n.read = true); }

  get unreadCount(): number { return this.notifications.filter(n => !n.read).length; }

  severityClass(s: string): string {
    return s === "critical" ? "sev-critical" : s === "warning" ? "sev-warning" : "sev-info";
  }

  typeIcon(type: string): string {
    const icons: Record<string, string> = {
      maintenance: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="16" height="16"><circle cx="12" cy="12" r="3"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>`,
      refill:      `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="16" height="16"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
      delivery:    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="16" height="16"><polyline points="20 6 9 17 4 12"/></svg>`,
      alert:       `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="16" height="16"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>`,
    };
    return icons[type] ?? icons["alert"];
  }
}
