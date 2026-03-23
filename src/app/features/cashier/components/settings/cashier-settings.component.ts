import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators, AbstractControl } from '@angular/forms';
import { trigger, transition, style, animate, query, stagger } from '@angular/animations';
import { ThemeService, Theme } from '../../../../core/services/theme.service';
import { SoundService } from '../../../../core/services/sound.service';
import { Subscription } from 'rxjs';

export type AccentColor = 'teal' | 'blue' | 'purple' | 'rose';
interface Session { id: string; device: string; location: string; signIn: Date; signOut: Date | null; current: boolean; }

@Component({
  selector: 'app-cashier-settings',
  templateUrl: './cashier-settings.component.html',
  styleUrls: ['./cashier-settings.component.scss'],
  animations: [
    trigger('tabContent', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(14px)' }),
        animate('320ms cubic-bezier(0.35,0,0.25,1)', style({ opacity: 1, transform: 'translateY(0)' }))
      ])
    ]),
    trigger('stagger', [
      transition('* => *', [
        query(':enter', [
          style({ opacity: 0, transform: 'translateY(16px)' }),
          stagger(60, [animate('300ms cubic-bezier(0.35,0,0.25,1)', style({ opacity: 1, transform: 'translateY(0)' }))])
        ], { optional: true })
      ])
    ])
  ]
})
export class CashierSettingsComponent implements OnInit, OnDestroy {
  activeTab: 'security' | 'preferences' | 'notifications' = 'security';
  theme: Theme = 'dark';
  accentColor: AccentColor = 'teal';
  private sub!: Subscription;

  otpStep: 'idle' | 'sent' | 'verify' | 'new' = 'idle';
  otpForm!: FormGroup;
  passwordForm!: FormGroup;
  otpCountdown = 0;
  private countdownInterval: any;

  sessions: Session[] = [
    { id: 's1', device: 'Chrome · Windows 11', location: 'Chennai, IN',   signIn: new Date('2026-03-17T08:05:00'), signOut: null,                           current: true  },
    { id: 's2', device: 'Safari · iPhone 14',  location: 'Mumbai, IN',    signIn: new Date('2026-03-14T17:30:00'), signOut: new Date('2026-03-14T19:00:00'), current: false },
    { id: 's3', device: 'Firefox · macOS',     location: 'Bengaluru, IN', signIn: new Date('2026-03-10T09:15:00'), signOut: new Date('2026-03-10T10:45:00'), current: false },
  ];

  notifPrefs = { paymentConfirmed: true, billGenerated: true, systemMaintenance: true, overdueAlert: true, reportReady: false };

  accentOptions: { value: AccentColor; label: string; color: string }[] = [
    { value: 'teal',   label: 'Teal',   color: '#14b8a6' },
    { value: 'blue',   label: 'Blue',   color: '#3b82f6' },
    { value: 'purple', label: 'Purple', color: '#a855f7' },
    { value: 'rose',   label: 'Rose',   color: '#f43f5e' },
  ];

  tabs = [
    { id: 'security',      label: 'Security',      icon: 'shield'  },
    { id: 'preferences',   label: 'Preferences',   icon: 'sliders' },
    { id: 'notifications', label: 'Notifications', icon: 'bell'    },
  ] as const;

  constructor(private fb: FormBuilder, public themeService: ThemeService, public soundService: SoundService) {}

  ngOnInit(): void {
    this.sub = this.themeService.theme$.subscribe(t => this.theme = t);
    const saved = localStorage.getItem('dm-accent') as AccentColor;
    if (saved) this.setAccent(saved, false);
    this.otpForm = this.fb.group({ otp: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]] });
    this.passwordForm = this.fb.group({
      newPassword:     ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', Validators.required]
    }, { validators: this.passwordMatch });
  }

  ngOnDestroy(): void { this.sub?.unsubscribe(); clearInterval(this.countdownInterval); }

  setAccent(color: AccentColor, save = true): void {
    this.accentColor = color;
    const map: Record<AccentColor, { accent: string; dim: string }> = {
      teal:   { accent: '#14b8a6', dim: 'rgba(20,184,166,0.15)'  },
      blue:   { accent: '#3b82f6', dim: 'rgba(59,130,246,0.15)'  },
      purple: { accent: '#a855f7', dim: 'rgba(168,85,247,0.15)'  },
      rose:   { accent: '#f43f5e', dim: 'rgba(244,63,94,0.15)'   },
    };
    const { accent, dim } = map[color];
    document.documentElement.style.setProperty('--accent', accent);
    document.documentElement.style.setProperty('--accent-dim', dim);
    if (save) { localStorage.setItem('dm-accent', color); this.soundService.playClick(); }
  }

  requestOtp(): void {
    this.otpStep = 'sent'; this.otpCountdown = 60;
    this.countdownInterval = setInterval(() => {
      this.otpCountdown--;
      if (this.otpCountdown <= 0) { clearInterval(this.countdownInterval); if (this.otpStep === 'sent') this.otpStep = 'idle'; }
    }, 1000);
  }

  verifyOtp(): void { if (this.otpForm.valid) this.otpStep = 'new'; }

  savePassword(): void {
    if (this.passwordForm.valid) {
      this.otpStep = 'idle'; this.otpForm.reset(); this.passwordForm.reset();
      clearInterval(this.countdownInterval); this.soundService.playSuccess();
    }
  }

  cancelOtp(): void {
    this.otpStep = 'idle'; this.otpForm.reset(); this.passwordForm.reset();
    clearInterval(this.countdownInterval);
  }

  private passwordMatch(g: AbstractControl) {
    const pw = g.get('newPassword')?.value, cf = g.get('confirmPassword')?.value;
    return pw === cf ? null : { mismatch: true };
  }

  setTab(tab: typeof this.activeTab): void { this.activeTab = tab; }

  formatDate(d: Date): string {
    return d.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  getIcon(name: string): string {
    const icons: Record<string, string> = {
      shield:  `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`,
      sliders: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/></svg>`,
      bell:    `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>`,
      lock:    `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>`,
      monitor: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>`,
      check:   `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>`,
    };
    return icons[name] ?? '';
  }
}
