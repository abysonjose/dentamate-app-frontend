import {
  Component, OnInit, OnDestroy, AfterViewInit,
  ElementRef, ViewChild, NgZone
} from '@angular/core';
import { FormBuilder, FormGroup, Validators, AbstractControl } from '@angular/forms';
import { trigger, transition, style, animate, query, stagger } from '@angular/animations';
import { ThemeService, Theme } from '../../../../core/services/theme.service';
import { SoundService } from '../../../../core/services/sound.service';
import { Subscription } from 'rxjs';
import * as THREE from 'three';

export type AccentColor = 'teal' | 'blue' | 'purple' | 'rose';

interface Session {
  id: string; device: string; location: string;
  signIn: Date; signOut: Date | null; current: boolean;
}

@Component({
  selector: 'app-doc-settings',
  templateUrl: './doc-settings.component.html',
  styleUrls: ['./doc-settings.component.scss'],
  animations: [
    trigger('tabContent', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(14px)' }),
        animate('320ms cubic-bezier(0.35,0,0.25,1)', style({ opacity: 1, transform: 'translateY(0)' }))
      ]),
      transition(':leave', [
        animate('200ms ease', style({ opacity: 0, transform: 'translateY(-8px)' }))
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
export class DocSettingsComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('bgCanvas') canvasRef!: ElementRef<HTMLCanvasElement>;

  activeTab: 'security' | 'preferences' | 'notifications' = 'security';
  theme: Theme = 'dark';
  accentColor: AccentColor = 'teal';
  private sub!: Subscription;

  // Three.js
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private gearGroup!: THREE.Group;
  private particles!: THREE.Points;
  private animId!: number;
  private clock = new THREE.Clock();

  // Password / OTP flow
  otpStep: 'idle' | 'sent' | 'verify' | 'new' = 'idle';
  otpForm!: FormGroup;
  passwordForm!: FormGroup;
  otpCountdown = 0;
  private countdownInterval: any;

  sessions: Session[] = [
    { id: 's1', device: 'Chrome · Windows 11',  location: 'Dubai, UAE',   signIn: new Date('2026-03-17T08:10:00'), signOut: null,                          current: true  },
    { id: 's2', device: 'Safari · iPhone 15',   location: 'Abu Dhabi, UAE', signIn: new Date('2026-03-15T18:45:00'), signOut: new Date('2026-03-15T20:00:00'), current: false },
    { id: 's3', device: 'Firefox · macOS',      location: 'London, UK',   signIn: new Date('2026-03-12T10:30:00'), signOut: new Date('2026-03-12T11:55:00'), current: false },
  ];

  notifPrefs = {
    labReports:          true,
    appointmentUpdates:  true,
    patientArrivals:     true,
    leaveApprovals:      true,
    aiCreditAlerts:      true,
    systemMaintenance:   false,
  };

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

  constructor(
    private fb: FormBuilder,
    public themeService: ThemeService,
    public soundService: SoundService,
    private ngZone: NgZone
  ) {}

  ngOnInit(): void {
    this.sub = this.themeService.theme$.subscribe(t => {
      this.theme = t;
      this.updateRendererBg();
    });
    const saved = localStorage.getItem('dm-accent') as AccentColor;
    if (saved) this.setAccent(saved, false);

    this.otpForm = this.fb.group({
      otp: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]]
    });
    this.passwordForm = this.fb.group({
      newPassword:     ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', Validators.required]
    }, { validators: this.passwordMatch });
  }

  ngAfterViewInit(): void { this.initThree(); }

  // ── Three.js ──────────────────────────────────────────────────────────────

  private initThree(): void {
    const canvas = this.canvasRef.nativeElement;
    const w = canvas.clientWidth || window.innerWidth;
    const h = canvas.clientHeight || 280;

    this.scene  = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(55, w / h, 0.1, 200);
    this.camera.position.set(0, 0, 14);

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    this.renderer.setSize(w, h);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    this.scene.add(new THREE.AmbientLight(0x0d9488, 0.5));
    const pt = new THREE.PointLight(0x14b8a6, 60, 50);
    pt.position.set(-5, 5, 8);
    this.scene.add(pt);

    this.buildGear();
    this.buildParticles();
    this.updateRendererBg();
    this.ngZone.runOutsideAngular(() => this.animate());
  }

  private buildGear(): void {
    this.gearGroup = new THREE.Group();
    const mat = new THREE.MeshPhysicalMaterial({
      color: 0x14b8a6, emissive: 0x0d9488, emissiveIntensity: 0.25,
      metalness: 0.7, roughness: 0.2, transparent: true, opacity: 0.85,
    });
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.2, 0.4, 64), mat);
    disc.rotation.x = Math.PI / 2;
    this.gearGroup.add(disc);
    this.gearGroup.add(new THREE.Mesh(
      new THREE.TorusGeometry(0.7, 0.18, 16, 64),
      new THREE.MeshPhysicalMaterial({ color: 0x020c18, metalness: 0.9, roughness: 0.1 })
    ));
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2;
      const tooth = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.4, 0.55), mat);
      tooth.position.set(Math.cos(angle) * 2.55, 0, Math.sin(angle) * 2.55);
      tooth.rotation.y = -angle;
      this.gearGroup.add(tooth);
    }
    const wireMat = new THREE.MeshBasicMaterial({ color: 0x14b8a6, wireframe: true, transparent: true, opacity: 0.07 });
    this.gearGroup.add(new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.2, 0.4, 24), wireMat));
    this.gearGroup.position.set(4, 0, 0);
    this.scene.add(this.gearGroup);
  }

  private buildParticles(): void {
    const count = 600;
    const positions = new Float32Array(count * 3);
    const colors    = new Float32Array(count * 3);
    const c1 = new THREE.Color(0x14b8a6), c2 = new THREE.Color(0x3b82f6);
    for (let i = 0; i < count; i++) {
      positions[i*3]   = (Math.random()-0.5)*28;
      positions[i*3+1] = (Math.random()-0.5)*16;
      positions[i*3+2] = (Math.random()-0.5)*12 - 4;
      const c = Math.random() > 0.5 ? c1 : c2;
      colors[i*3] = c.r; colors[i*3+1] = c.g; colors[i*3+2] = c.b;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color',    new THREE.BufferAttribute(colors, 3));
    this.particles = new THREE.Points(geo, new THREE.PointsMaterial({
      size: 0.055, vertexColors: true, transparent: true, opacity: 0.6, sizeAttenuation: true
    }));
    this.scene.add(this.particles);
  }

  private animate(): void {
    this.animId = requestAnimationFrame(() => this.animate());
    const t = this.clock.getElapsedTime();
    if (this.gearGroup) {
      this.gearGroup.rotation.z = t * 0.3;
      this.gearGroup.rotation.x = Math.sin(t * 0.4) * 0.15;
    }
    if (this.particles) {
      this.particles.rotation.y = t * 0.012;
      const pos = (this.particles.geometry.attributes['position'] as THREE.BufferAttribute).array as Float32Array;
      for (let i = 0; i < pos.length / 3; i++) {
        pos[i*3+1] += Math.sin(t + pos[i*3] * 0.3) * 0.002;
      }
      this.particles.geometry.attributes['position'].needsUpdate = true;
    }
    this.renderer?.render(this.scene, this.camera);
  }

  private updateRendererBg(): void {
    if (!this.renderer) return;
    this.renderer.setClearColor(this.theme === 'dark' ? 0x070f1a : 0xf0f4f8, 0);
  }

  // ── Accent ────────────────────────────────────────────────────────────────

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
    if (save) localStorage.setItem('dm-accent', color);
    if (this.gearGroup) {
      this.gearGroup.traverse(obj => {
        if (obj instanceof THREE.Mesh && obj.material instanceof THREE.MeshPhysicalMaterial) {
          obj.material.color.set(accent);
          obj.material.emissive.set(accent);
        }
      });
    }
  }

  // ── OTP / Password ────────────────────────────────────────────────────────

  requestOtp(): void {
    this.otpStep = 'sent';
    this.otpCountdown = 60;
    this.countdownInterval = setInterval(() => {
      this.otpCountdown--;
      if (this.otpCountdown <= 0) {
        clearInterval(this.countdownInterval);
        if (this.otpStep === 'sent') this.otpStep = 'idle';
      }
    }, 1000);
  }

  verifyOtp(): void { if (this.otpForm.valid) this.otpStep = 'new'; }

  savePassword(): void {
    if (this.passwordForm.valid) {
      this.otpStep = 'idle';
      this.otpForm.reset();
      this.passwordForm.reset();
      clearInterval(this.countdownInterval);
      this.soundService.playSuccess();
    }
  }

  cancelOtp(): void {
    this.otpStep = 'idle';
    this.otpForm.reset();
    this.passwordForm.reset();
    clearInterval(this.countdownInterval);
  }

  private passwordMatch(g: AbstractControl) {
    const pw = g.get('newPassword')?.value;
    const cf = g.get('confirmPassword')?.value;
    return pw === cf ? null : { mismatch: true };
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

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

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
    cancelAnimationFrame(this.animId);
    this.renderer?.dispose();
    clearInterval(this.countdownInterval);
  }
}
