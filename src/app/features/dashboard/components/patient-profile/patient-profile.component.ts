import {
  Component, OnInit, OnDestroy, AfterViewInit,
  ElementRef, ViewChild, NgZone
} from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { trigger, transition, style, animate } from '@angular/animations';
import { ThemeService, Theme } from '../../../../core/services/theme.service';
import { ProfileService } from '../../../../core/services/profile.service';
import { Subscription } from 'rxjs';
import * as THREE from 'three';

@Component({
  selector: 'app-patient-profile',
  templateUrl: './patient-profile.component.html',
  styleUrls: ['./patient-profile.component.scss'],
  animations: [
    trigger('fadeUp', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(18px)' }),
        animate('360ms cubic-bezier(0.35,0,0.25,1)',
                style({ opacity: 1, transform: 'translateY(0)' }))
      ])
    ])
  ]
})
export class PatientProfileComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('cardCanvas') canvasRef!: ElementRef<HTMLCanvasElement>;

  theme: Theme = 'dark';
  private sub!: Subscription;

  readonly userId = 'DM-20483';
  avatarDataUrl: string | null = null;
  private avatarImage: HTMLImageElement | null = null; // pre-loaded for canvas drawing
  idCopied = false;
  saveSuccess = false;

  profileForm!: FormGroup;

  // Three.js
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private cardGroup!: THREE.Group;
  private frontMesh!: THREE.Mesh;
  private backMesh!: THREE.Mesh;
  private frontTex!: THREE.CanvasTexture;
  private backTex!: THREE.CanvasTexture;
  private frontCanvas!: HTMLCanvasElement;
  private backCanvas!: HTMLCanvasElement;
  private particles!: THREE.Points;
  private animId!: number;
  private clock = new THREE.Clock();

  private targetRotY = 0;
  private currentRotY = 0;
  private isFlipped = false;
  private hoverTiltX = 0;
  private hoverTiltY = 0;

  constructor(
    private fb: FormBuilder,
    public themeService: ThemeService,
    public profileService: ProfileService,
    private ngZone: NgZone
  ) {}

  ngOnInit(): void {
    this.sub = this.themeService.theme$.subscribe(t => {
      this.theme = t;
      this.redrawTextures();
    });

    this.profileForm = this.fb.group({
      publicName: [{ value: this.profileService.name, disabled: true }, [Validators.required, Validators.minLength(2)]],
      email:      ['[email protected]', [Validators.required, Validators.email]],
      phone:      ['+234 800 000 0000', Validators.required],
      emergency:  ['+234 801 234 5678', Validators.required],
    });

    // Seed avatar from service if already set
    if (this.profileService.avatar) {
      this.avatarDataUrl = this.profileService.avatar;
      const img = new Image();
      img.onload = () => { this.avatarImage = img; this.redrawTextures(); };
      img.src = this.avatarDataUrl;
    }

    this.profileForm.get('publicName')!.valueChanges
      .subscribe(() => this.redrawTextures());
    this.profileForm.get('emergency')!.valueChanges
      .subscribe(() => this.redrawTextures());  }

  ngAfterViewInit(): void {
    this.initThree();
  }

  // ── Three.js init ─────────────────────────────────────────────────────────
  private initThree(): void {
    const canvas = this.canvasRef.nativeElement;
    const w = canvas.clientWidth  || 600;
    const h = canvas.clientHeight || 380;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 100);
    this.camera.position.set(0, 0, 7);

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    this.renderer.setSize(w, h);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // Lighting
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.6));
    const key = new THREE.PointLight(0x14b8a6, 80, 40);
    key.position.set(-4, 4, 6);
    this.scene.add(key);
    const fill = new THREE.PointLight(0x3b82f6, 50, 40);
    fill.position.set(4, -3, 5);
    this.scene.add(fill);

    // Off-screen canvases for card textures
    this.frontCanvas = document.createElement('canvas');
    this.frontCanvas.width = 1024; this.frontCanvas.height = 640;
    this.backCanvas  = document.createElement('canvas');
    this.backCanvas.width  = 1024; this.backCanvas.height = 640;

    this.frontTex = new THREE.CanvasTexture(this.frontCanvas);
    this.backTex  = new THREE.CanvasTexture(this.backCanvas);

    this.buildCard();
    this.buildParticles();
    this.redrawTextures();

    this.ngZone.runOutsideAngular(() => this.animate());
  }

  private buildCard(): void {
    this.cardGroup = new THREE.Group();

    const geo = new THREE.PlaneGeometry(5.2, 3.25, 1, 1);

    // Front face
    this.frontMesh = new THREE.Mesh(geo, new THREE.MeshPhysicalMaterial({
      map: this.frontTex,
      metalness: 0.15,
      roughness: 0.25,
      transparent: true,
      opacity: 0.97,
      side: THREE.FrontSide,
    }));

    // Back face — mirrored (rotated π on Y)
    this.backMesh = new THREE.Mesh(geo, new THREE.MeshPhysicalMaterial({
      map: this.backTex,
      metalness: 0.15,
      roughness: 0.25,
      transparent: true,
      opacity: 0.97,
      side: THREE.FrontSide,
    }));
    this.backMesh.rotation.y = Math.PI;

    this.cardGroup.add(this.frontMesh);
    this.cardGroup.add(this.backMesh);
    this.scene.add(this.cardGroup);
  }

  private buildParticles(): void {
    const count = 300;
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    const c1 = new THREE.Color(0x14b8a6);
    const c2 = new THREE.Color(0x3b82f6);
    for (let i = 0; i < count; i++) {
      pos[i*3]   = (Math.random()-0.5)*20;
      pos[i*3+1] = (Math.random()-0.5)*14;
      pos[i*3+2] = (Math.random()-0.5)*10 - 3;
      const c = Math.random() > 0.5 ? c1 : c2;
      col[i*3] = c.r; col[i*3+1] = c.g; col[i*3+2] = c.b;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color',    new THREE.BufferAttribute(col, 3));
    this.particles = new THREE.Points(geo, new THREE.PointsMaterial({
      size: 0.05, vertexColors: true, transparent: true, opacity: 0.55
    }));
    this.scene.add(this.particles);
  }

  // ── Canvas texture drawing ────────────────────────────────────────────────
  private redrawTextures(): void {
    if (!this.frontCanvas) return;
    this.drawFront();
    this.drawBack();
    if (this.frontTex) this.frontTex.needsUpdate = true;
    if (this.backTex)  this.backTex.needsUpdate  = true;
  }

  private drawFront(): void {
    const c = this.frontCanvas;
    const ctx = c.getContext('2d')!;
    const W = c.width, H = c.height;
    ctx.clearRect(0, 0, W, H);

    // Card background gradient
    const bg = ctx.createLinearGradient(0, 0, W, H);
    bg.addColorStop(0,   '#0d1b2e');
    bg.addColorStop(0.5, '#0f2744');
    bg.addColorStop(1,   '#071220');
    this.roundRect(ctx, 0, 0, W, H, 48, bg);

    // Glassmorphism overlay
    const glass = ctx.createLinearGradient(0, 0, W, H);
    glass.addColorStop(0, 'rgba(255,255,255,0.10)');
    glass.addColorStop(1, 'rgba(255,255,255,0.02)');
    this.roundRect(ctx, 0, 0, W, H, 48, glass);

    // Teal accent stripe
    const stripe = ctx.createLinearGradient(0, 0, W, 0);
    stripe.addColorStop(0, '#14b8a6');
    stripe.addColorStop(1, '#3b82f6');
    ctx.fillStyle = stripe;
    ctx.fillRect(0, H - 14, W, 14);

    // Holographic shimmer circles
    for (let i = 0; i < 3; i++) {
      const grd = ctx.createRadialGradient(W*0.75 + i*60, H*0.3, 0, W*0.75 + i*60, H*0.3, 180);
      grd.addColorStop(0, 'rgba(20,184,166,0.12)');
      grd.addColorStop(1, 'rgba(20,184,166,0)');
      ctx.fillStyle = grd;
      ctx.beginPath();
      ctx.arc(W*0.75 + i*60, H*0.3, 180, 0, Math.PI*2);
      ctx.fill();
    }

    // RFID chip graphic
    this.drawChip(ctx, 60, H - 110);

    // Logo text
    ctx.font = 'bold 38px Inter, system-ui, sans-serif';
    const logoGrad = ctx.createLinearGradient(60, 0, 300, 0);
    logoGrad.addColorStop(0, '#14b8a6');
    logoGrad.addColorStop(1, '#3b82f6');
    ctx.fillStyle = logoGrad;
    ctx.fillText('DentaMate', 60, 80);

    ctx.font = '22px Inter, system-ui, sans-serif';
    ctx.fillStyle = 'rgba(240,253,250,0.45)';
    ctx.fillText('Patient Hospital ID', 60, 112);

    // Patient photo circle
    const photoX = W - 200, photoY = 60, photoR = 90;
    ctx.save();
    ctx.beginPath();
    ctx.arc(photoX, photoY + photoR, photoR, 0, Math.PI*2);
    ctx.clip();
    if (this.avatarImage) {
      ctx.drawImage(this.avatarImage, photoX - photoR, photoY, photoR*2, photoR*2);
    } else {
      const avatarBg = ctx.createLinearGradient(photoX-photoR, photoY, photoX+photoR, photoY+photoR*2);
      avatarBg.addColorStop(0, '#0d9488');
      avatarBg.addColorStop(1, '#1d4ed8');
      ctx.fillStyle = avatarBg;
      ctx.fillRect(photoX - photoR, photoY, photoR*2, photoR*2);
      ctx.font = 'bold 64px Inter, system-ui, sans-serif';
      ctx.fillStyle = 'white';
      ctx.textAlign = 'center';
      ctx.fillText('JD', photoX, photoY + photoR + 22);
      ctx.textAlign = 'left';
    }
    ctx.restore();

    // Photo border ring
    ctx.beginPath();
    ctx.arc(photoX, photoY + photoR, photoR + 3, 0, Math.PI*2);
    ctx.strokeStyle = '#14b8a6';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Patient name
    const name = this.profileForm?.get('publicName')?.value || 'Jordan Davis';
    ctx.font = 'bold 44px Inter, system-ui, sans-serif';
    ctx.fillStyle = '#f0fdfa';
    ctx.fillText(name, 60, H - 160);

    // User ID label
    ctx.font = '22px "Courier New", monospace';
    ctx.fillStyle = '#14b8a6';
    ctx.fillText(this.userId, 60, H - 120);

    // QR code (procedural pixel grid)
    this.drawQR(ctx, W - 190, H - 210, 160, this.userId);
  }

  private drawBack(): void {
    const c = this.backCanvas;
    const ctx = c.getContext('2d')!;
    const W = c.width, H = c.height;
    ctx.clearRect(0, 0, W, H);

    // Background
    const bg = ctx.createLinearGradient(W, 0, 0, H);
    bg.addColorStop(0, '#0d1b2e');
    bg.addColorStop(1, '#071220');
    this.roundRect(ctx, 0, 0, W, H, 48, bg);

    const glass = ctx.createLinearGradient(W, 0, 0, H);
    glass.addColorStop(0, 'rgba(255,255,255,0.09)');
    glass.addColorStop(1, 'rgba(255,255,255,0.02)');
    this.roundRect(ctx, 0, 0, W, H, 48, glass);

    // Magnetic stripe
    ctx.fillStyle = '#111827';
    ctx.fillRect(0, 60, W, 80);
    ctx.fillStyle = 'rgba(20,184,166,0.15)';
    ctx.fillRect(0, 60, W, 80);

    // Barcode
    this.drawBarcode(ctx, W/2 - 200, 200, 400, 90, this.userId);

    ctx.font = '20px "Courier New", monospace';
    ctx.fillStyle = 'rgba(240,253,250,0.5)';
    ctx.textAlign = 'center';
    ctx.fillText(this.userId, W/2, 310);
    ctx.textAlign = 'left';

    // Emergency contact
    ctx.font = 'bold 26px Inter, system-ui, sans-serif';
    ctx.fillStyle = 'rgba(240,253,250,0.5)';
    ctx.fillText('EMERGENCY CONTACT', 60, 400);

    const emergency = this.profileForm?.get('emergency')?.value || '+234 801 234 5678';
    ctx.font = 'bold 38px Inter, system-ui, sans-serif';
    ctx.fillStyle = '#f0fdfa';
    ctx.fillText(emergency, 60, 448);

    // Scan instruction
    const scanGrad = ctx.createLinearGradient(60, 0, 500, 0);
    scanGrad.addColorStop(0, '#14b8a6');
    scanGrad.addColorStop(1, '#3b82f6');
    ctx.font = 'bold 30px Inter, system-ui, sans-serif';
    ctx.fillStyle = scanGrad;
    ctx.fillText('⬡  SCAN AT CLINIC RECEPTION', 60, H - 80);

    ctx.font = '22px Inter, system-ui, sans-serif';
    ctx.fillStyle = 'rgba(240,253,250,0.4)';
    ctx.fillText('Present this card to activate your queue position', 60, H - 44);

    // Bottom stripe
    const stripe = ctx.createLinearGradient(W, 0, 0, 0);
    stripe.addColorStop(0, '#14b8a6');
    stripe.addColorStop(1, '#3b82f6');
    ctx.fillStyle = stripe;
    ctx.fillRect(0, H - 14, W, 14);
  }

  // ── Drawing helpers ───────────────────────────────────────────────────────
  private roundRect(
    ctx: CanvasRenderingContext2D, x: number, y: number,
    w: number, h: number, r: number,
    fill: string | CanvasGradient
  ): void {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
  }

  private drawChip(ctx: CanvasRenderingContext2D, x: number, y: number): void {
    const cg = ctx.createLinearGradient(x, y, x+70, y+50);
    cg.addColorStop(0, '#d4af37');
    cg.addColorStop(1, '#b8860b');
    ctx.fillStyle = cg;
    ctx.beginPath();
    ctx.roundRect(x, y, 70, 50, 6);
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.3)';
    ctx.lineWidth = 1;
    // Chip lines
    for (let i = 1; i < 4; i++) {
      ctx.beginPath(); ctx.moveTo(x, y + i*12); ctx.lineTo(x+70, y + i*12); ctx.stroke();
    }
    ctx.beginPath(); ctx.moveTo(x+35, y); ctx.lineTo(x+35, y+50); ctx.stroke();
  }

  private drawQR(
    ctx: CanvasRenderingContext2D,
    x: number, y: number, size: number, data: string
  ): void {
    const cells = 21;
    const cell  = size / cells;
    // Deterministic pixel pattern from data string
    const seed  = data.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
    const rand  = (i: number) => ((seed * 9301 + i * 49297) % 233280) / 233280;

    ctx.fillStyle = 'white';
    ctx.fillRect(x - 4, y - 4, size + 8, size + 8);

    ctx.fillStyle = '#0d1b2e';
    for (let r = 0; r < cells; r++) {
      for (let col = 0; col < cells; col++) {
        const isCorner =
          (r < 7 && col < 7) || (r < 7 && col >= cells-7) || (r >= cells-7 && col < 7);
        const on = isCorner ? this.qrCorner(r, col, cells) : rand(r * cells + col) > 0.5;
        if (on) ctx.fillRect(x + col*cell, y + r*cell, cell-0.5, cell-0.5);
      }
    }
  }

  private qrCorner(r: number, col: number, cells: number): boolean {
    const inBox = (rr: number, cc: number, or: number, oc: number) =>
      rr >= or && rr < or+7 && cc >= oc && cc < oc+7;
    const border = (rr: number, cc: number, or: number, oc: number) =>
      inBox(rr, cc, or, oc) && (rr===or||rr===or+6||cc===oc||cc===oc+6);
    const inner  = (rr: number, cc: number, or: number, oc: number) =>
      rr>=or+2&&rr<=or+4&&cc>=oc+2&&cc<=oc+4;
    return border(r,col,0,0)||inner(r,col,0,0)||
           border(r,col,0,cells-7)||inner(r,col,0,cells-7)||
           border(r,col,cells-7,0)||inner(r,col,cells-7,0);
  }

  private drawBarcode(
    ctx: CanvasRenderingContext2D,
    x: number, y: number, w: number, h: number, data: string
  ): void {
    const bars = 80;
    const bw   = w / bars;
    for (let i = 0; i < bars; i++) {
      const seed = data.charCodeAt(i % data.length) + i;
      const dark = (seed * 7 + i * 13) % 3 !== 0;
      ctx.fillStyle = dark ? '#f0fdfa' : 'transparent';
      if (dark) ctx.fillRect(x + i*bw, y, bw - 0.5, h);
    }
  }

  // ── Animation loop ────────────────────────────────────────────────────────
  private animate(): void {
    this.animId = requestAnimationFrame(() => this.animate());
    const t = this.clock.getElapsedTime();

    // Smooth flip interpolation
    this.currentRotY += (this.targetRotY - this.currentRotY) * 0.06;
    if (this.cardGroup) {
      this.cardGroup.rotation.y = this.currentRotY;
      // Subtle idle bob
      this.cardGroup.position.y = Math.sin(t * 0.8) * 0.08;
      // Hover tilt
      this.cardGroup.rotation.x += (this.hoverTiltX - this.cardGroup.rotation.x) * 0.05;
    }
    if (this.particles) {
      this.particles.rotation.y = t * 0.01;
    }
    this.renderer?.render(this.scene, this.camera);
  }

  // ── Interaction ───────────────────────────────────────────────────────────
  onCardMouseMove(e: MouseEvent): void {
    const el = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const nx = (e.clientX - el.left) / el.width  - 0.5;
    const ny = (e.clientY - el.top)  / el.height - 0.5;
    this.hoverTiltX = -ny * 0.25;
    // Subtle extra Y tilt on hover (not full flip)
    if (!this.isFlipped) {
      this.targetRotY = nx * 0.3;
    }
  }

  onCardMouseLeave(): void {
    this.hoverTiltX = 0;
    this.targetRotY = this.isFlipped ? Math.PI : 0;
  }

  flipCard(): void {
    this.isFlipped = !this.isFlipped;
    this.targetRotY = this.isFlipped ? Math.PI : 0;
  }

  onResize(): void {
    if (!this.renderer || !this.canvasRef) return;
    const canvas = this.canvasRef.nativeElement;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }

  // ── Profile actions ───────────────────────────────────────────────────────
  onFileChange(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => {
      this.avatarDataUrl = e.target?.result as string;
      // Push to shared service so header/sidebar update immediately
      this.profileService.setAvatar(this.avatarDataUrl);
      const img = new Image();
      img.onload = () => {
        this.avatarImage = img;
        this.redrawTextures();
      };
      img.src = this.avatarDataUrl;
    };
    reader.readAsDataURL(file);
  }

  saveProfile(): void {
    if (this.profileForm.invalid) return;
    // Push to shared service — updates sidebar, header, identity card
    this.profileService.setName(this.profileForm.get('publicName')!.value);
    // Redraw 3D card with new name
    this.redrawTextures();
    this.saveSuccess = true;
    setTimeout(() => this.saveSuccess = false, 3000);
    // POST to Node.js/Express backend here
  }

  copyUserId(): void {
    navigator.clipboard.writeText(this.userId).then(() => {
      this.idCopied = true;
      setTimeout(() => this.idCopied = false, 2000);
    });
  }

  getIcon(name: string): string {
    const icons: Record<string, string> = {
      copy:   `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>`,
      check:  `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>`,
      camera: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></svg>`,
      flip:   `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 014-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 01-4 4H3"/></svg>`,
      user:   `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`,
      rfid:   `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12.55a11 11 0 0114.08 0"/><path d="M1.42 9a16 16 0 0121.16 0"/><path d="M8.53 16.11a6 6 0 016.95 0"/><circle cx="12" cy="20" r="1"/></svg>`,
    };
    return icons[name] ?? '';
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
    cancelAnimationFrame(this.animId);
    this.renderer?.dispose();
  }
}
