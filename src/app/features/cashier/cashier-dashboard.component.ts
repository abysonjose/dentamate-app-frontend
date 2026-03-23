import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { trigger, transition, style, animate } from '@angular/animations';
import { ThemeService, Theme } from '../../core/services/theme.service';
import { SoundService } from '../../core/services/sound.service';
import { CashierDataService, CashierNotification } from '../../core/services/cashier-data.service';
import { Subscription } from 'rxjs';

interface NavItem { icon: string; label: string; id: string; badge?: number; }

@Component({
  selector: 'app-cashier-dashboard',
  templateUrl: './cashier-dashboard.component.html',
  styleUrls: ['./cashier-dashboard.component.scss'],
  animations: [
    trigger('sidebarSlide', [
      transition(':enter', [
        style({ transform: 'translateX(-100%)', opacity: 0 }),
        animate('300ms cubic-bezier(0.35,0,0.25,1)', style({ transform: 'translateX(0)', opacity: 1 }))
      ]),
      transition(':leave', [
        animate('250ms ease', style({ transform: 'translateX(-100%)', opacity: 0 }))
      ])
    ]),
    trigger('contentFade', [
      transition('* => *', [
        style({ opacity: 0, transform: 'translateY(10px)' }),
        animate('350ms 60ms cubic-bezier(0.35,0,0.25,1)', style({ opacity: 1, transform: 'translateY(0)' }))
      ])
    ])
  ]
})
export class CashierDashboardComponent implements OnInit, OnDestroy {
  theme: Theme = 'dark';
  sidebarOpen = true;
  mobileMenuOpen = false;
  activeSection = 'billing';
  profileMenuOpen = false;
  notifBadge = 0;
  private subs: Subscription[] = [];

  // Cashier profile
  cashierId    = 'STF-00004';
  cashierName  = 'Ananya Krishnan';
  cashierPhone = '+1 512-555-0411';
  cashierEmail = '[email protected]';
  cashierDept  = 'Finance & Billing';
  avatarUrl: string | null = null;
  editingContact = false;
  editPhone = '';
  editEmail = '';

  navItems: NavItem[] = [
    { icon: 'billing',  label: 'Billing & Payment', id: 'billing'                },
    { icon: 'reports',  label: 'Financial Reports',  id: 'reports'                },
    { icon: 'chat',     label: 'Staff Chat',         id: 'chat',   badge: 3       },
    { icon: 'bell',     label: 'Notifications',      id: 'notifications', badge: 2 },
    { icon: 'vault',    label: 'Financial Pulse 3D', id: 'pulse3d'                },
    { icon: 'user',     label: 'My Profile',         id: 'profile'                },
    { icon: 'settings', label: 'Settings',           id: 'settings'               },
  ];

  constructor(
    public themeService: ThemeService,
    public soundService: SoundService,
    private cashierData: CashierDataService,
    private sanitizer: DomSanitizer
  ) {}

  ngOnInit(): void {
    this.subs.push(this.themeService.theme$.subscribe(t => this.theme = t));
    this.checkViewport();
    this.cashierData.getNotifications().subscribe((n: CashierNotification[]) => {
      this.notifBadge = n.filter(x => !x.read).length;
      const notifNav = this.navItems.find(i => i.id === 'notifications');
      if (notifNav) notifNav.badge = this.notifBadge;
    });
    this.cashierData.getChatContacts().subscribe(contacts => {
      const unread = contacts.reduce((s, c) => s + c.unread, 0);
      const chatNav = this.navItems.find(i => i.id === 'chat');
      if (chatNav) chatNav.badge = unread || undefined;
    });
  }

  ngOnDestroy(): void { this.subs.forEach(s => s.unsubscribe()); }

  @HostListener('window:resize')
  checkViewport(): void { this.sidebarOpen = window.innerWidth >= 1024; }

  @HostListener('document:click', ['$event'])
  onDocClick(e: MouseEvent): void {
    if (!(e.target as HTMLElement).closest('.header-avatar-wrap')) {
      this.profileMenuOpen = false;
    }
  }

  navigate(id: string): void {
    this.soundService.playClick();
    this.activeSection = id;
    this.profileMenuOpen = false;
    if (window.innerWidth < 1024) this.mobileMenuOpen = false;
  }

  toggleProfileMenu(): void { this.profileMenuOpen = !this.profileMenuOpen; }

  startEditContact(): void {
    this.editPhone = this.cashierPhone;
    this.editEmail = this.cashierEmail;
    this.editingContact = true;
  }

  saveContact(): void {
    this.cashierPhone = this.editPhone;
    this.cashierEmail = this.editEmail;
    this.editingContact = false;
    this.soundService.playSuccess();
  }

  cancelEdit(): void { this.editingContact = false; }

  onPhotoChange(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => this.avatarUrl = e.target?.result as string;
    reader.readAsDataURL(file);
  }

  get today(): string {
    return new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  }

  getSectionTitle(): string {
    return this.navItems.find(n => n.id === this.activeSection)?.label ?? 'Cashier Dashboard';
  }

  get initials(): string {
    return this.cashierName.split(' ').filter(Boolean).map(w => w[0]).join('').slice(0, 2).toUpperCase();
  }

  getIcon(name: string): SafeHtml {
    const icons: Record<string, string> = {
      billing:   `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/><path d="M6 15h4M14 15h4"/></svg>`,
      reports:   `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 3v18h18"/><path d="M7 16l4-4 4 4 4-8"/></svg>`,
      chat:      `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>`,
      bell:      `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>`,
      vault:     `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="12" cy="12" r="4"/><path d="M12 8v1M12 15v1M8 12h1M15 12h1"/></svg>`,
      user:      `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`,
      settings:  `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>`,
      'log-out': `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>`,
      menu:      `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>`,
      sun:       `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><line x1="12" y1="2" x2="12" y2="4"/><line x1="12" y1="20" x2="12" y2="22"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="2" y1="12" x2="4" y2="12"/><line x1="20" y1="12" x2="22" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>`,
      moon:      `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>`,
      edit:      `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`,
      camera:    `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></svg>`,
      check:     `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>`,
      x:         `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,
    };
    return this.sanitizer.bypassSecurityTrustHtml(icons[name] ?? '');
  }
}
