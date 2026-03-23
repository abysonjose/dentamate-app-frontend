import { Component, OnInit, OnDestroy, HostListener } from "@angular/core";
import { trigger, transition, style, animate, query, stagger } from "@angular/animations";
import { ThemeService, Theme } from "../../core/services/theme.service";
import { SoundService } from "../../core/services/sound.service";
import { PharmacistDataService, PharmacyNotification } from "../../core/services/pharmacist-data.service";
import { Subscription } from "rxjs";

interface NavItem { icon: string; label: string; id: string; badge?: number; }

@Component({
  selector: "app-pharmacist-dashboard",
  templateUrl: "./pharmacist-dashboard.component.html",
  styleUrls: ["./pharmacist-dashboard.component.scss"],
  animations: [
    trigger("sidebarSlide", [
      transition(":enter", [
        style({ transform: "translateX(-100%)", opacity: 0 }),
        animate("300ms cubic-bezier(0.35,0,0.25,1)", style({ transform: "translateX(0)", opacity: 1 }))
      ]),
      transition(":leave", [animate("250ms ease", style({ transform: "translateX(-100%)", opacity: 0 }))])
    ]),
    trigger("contentFade", [
      transition("* => *", [
        style({ opacity: 0, transform: "translateY(10px)" }),
        animate("350ms 60ms cubic-bezier(0.35,0,0.25,1)", style({ opacity: 1, transform: "translateY(0)" }))
      ])
    ]),
    trigger("staggerCards", [
      transition("* => *", [
        query(":enter", [
          style({ opacity: 0, transform: "translateY(18px)" }),
          stagger(60, [animate("320ms cubic-bezier(0.35,0,0.25,1)", style({ opacity: 1, transform: "translateY(0)" }))])
        ], { optional: true })
      ])
    ])
  ]
})
export class PharmacistDashboardComponent implements OnInit, OnDestroy {
  theme: Theme = "dark";
  sidebarOpen = true;
  mobileMenuOpen = false;
  activeSection = "delivery";
  profileMenuOpen = false;
  notifBadge = 0;
  private subs: Subscription[] = [];

  pharmacistId    = "STF-00006";
  pharmacistName  = "Layla Al-Farsi";
  pharmacistDept  = "Pharmacy";
  pharmacistPhone = "+1 512-555-0451";
  pharmacistEmail = "layla@dentamate.com";
  avatarUrl: string | null = null;
  editingContact = false;
  editPhone = "";
  editEmail = "";

  get initials(): string { return this.pharmacistName.split(" ").map(n => n[0]).join("").toUpperCase(); }
  get today(): string { return new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" }); }

  navItems: NavItem[] = [
    { icon: "pill",      label: "Medication Delivery", id: "delivery"                   },
    { icon: "inventory", label: "Inventory",           id: "inventory"                  },
    { icon: "shelf3d",   label: "Inventory 3D",        id: "shelf3d"                    },
    { icon: "chat",      label: "Staff Chat",          id: "chat",          badge: 3    },
    { icon: "bell",      label: "Notifications",       id: "notifications", badge: 2    },
    { icon: "user",      label: "My Profile",          id: "profile"                    },
    { icon: "settings",  label: "Settings",            id: "settings"                   },
  ];

  constructor(
    public themeService: ThemeService,
    public soundService: SoundService,
    private pharmData: PharmacistDataService
  ) {}

  ngOnInit(): void {
    this.subs.push(this.themeService.theme$.subscribe(t => this.theme = t));
    this.checkViewport();
    this.pharmData.getNotifications().subscribe((n: PharmacyNotification[]) => {
      this.notifBadge = n.filter(x => !x.read).length;
      const notifNav = this.navItems.find(i => i.id === "notifications");
      if (notifNav) notifNav.badge = this.notifBadge;
    });
    this.pharmData.getChatContacts().subscribe(contacts => {
      const unread = contacts.reduce((s, c) => s + c.unread, 0);
      const chatNav = this.navItems.find(i => i.id === "chat");
      if (chatNav) chatNav.badge = unread;
    });
    this.subs.push(
      this.pharmData.paymentConfirmed$.subscribe(patientId => {
        this.pharmData.updateBillStatus(patientId, "paid");
        this.soundService.playNotification();
      })
    );
  }

  ngOnDestroy(): void { this.subs.forEach(s => s.unsubscribe()); }

  @HostListener("window:resize")
  checkViewport(): void { this.sidebarOpen = window.innerWidth >= 1024; }

  toggleProfileMenu(): void { this.profileMenuOpen = !this.profileMenuOpen; }

  @HostListener('document:click', ['$event'])
  onDocClick(e: MouseEvent): void {
    if (!(e.target as HTMLElement).closest('.header-avatar-wrap')) this.profileMenuOpen = false;
  }

  navigate(id: string): void {
    this.soundService.playClick();
    this.activeSection = id;
    this.mobileMenuOpen = false;
    this.profileMenuOpen = false;
  }

  getSectionTitle(): string {
    const map: Record<string, string> = {
      delivery: "Medication Delivery", inventory: "Inventory Management",
      shelf3d: "Inventory 3D View", chat: "Staff Chat",
      notifications: "Notifications", profile: "My Profile", settings: "Settings",
    };
    return map[this.activeSection] ?? "Pharmacist Dashboard";
  }

  onAvatarChange(e: Event): void {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => this.avatarUrl = ev.target?.result as string;
    reader.readAsDataURL(file);
  }

  startEditContact(): void { this.editPhone = this.pharmacistPhone; this.editEmail = this.pharmacistEmail; this.editingContact = true; }
  saveContact(): void { this.pharmacistPhone = this.editPhone; this.pharmacistEmail = this.editEmail; this.editingContact = false; this.soundService.playClick(); }
  getIcon(name: string): string { return ICONS[name] ?? ""; }
}

const ICONS: Record<string, string> = {
  pill:      `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="2" y="6" width="20" height="12" rx="6"/><line x1="12" y1="6" x2="12" y2="18"/></svg>`,
  inventory: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="2" y="3" width="20" height="5" rx="1"/><rect x="2" y="10" width="20" height="5" rx="1"/><rect x="2" y="17" width="20" height="4" rx="1"/></svg>`,
  shelf3d:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M2 20h20M2 14h20M2 8h20M5 8v12M12 8v12M19 8v12"/></svg>`,
  chat:      `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`,
  bell:      `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>`,
  user:      `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`,
  settings:  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="3"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>`,
  "log-out": `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>`,
  menu:      `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>`,
  sun:       `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/></svg>`,
  moon:      `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`,
  search:    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>`,
  check:     `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>`,
  alert:     `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
  send:      `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>`,
  edit:      `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`,
  camera:    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>`,
  lock:      `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>`,
  truck:     `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>`,
  mail:      `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>`,
  refresh:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>`,
};
