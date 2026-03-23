import {
  Component, OnInit, AfterViewInit, OnDestroy,
  ViewChild, ElementRef, NgZone, HostListener
} from '@angular/core';
import * as THREE from 'three';
import { trigger, transition, style, animate } from '@angular/animations';

interface ToothZone { name: string; mesh: THREE.Mesh; color: number; hovered: boolean; }

@Component({
  selector: 'app-tooth-viewer',
  template: `
    <div class="glass-card tooth-hero">
      <div class="tooth-info">
        <div class="tooth-badge">3D Dental Model</div>
        <h2>Your Dental Health</h2>
        <p>Hover over zones to inspect areas of interest</p>
        <div class="zone-legend">
          <span *ngFor="let z of zoneLabels" class="zone-chip" [style.background]="z.color">{{ z.name }}</span>
        </div>
        <div class="hovered-zone" *ngIf="hoveredZone" [@fadeIn]>
          <span class="zone-dot"></span> {{ hoveredZone }}
        </div>
      </div>
      <div class="canvas-container" #container>
        <canvas #toothCanvas></canvas>
      </div>
    </div>
  `,
  styleUrls: ['./tooth-viewer.component.scss'],
  animations: [
    trigger('fadeIn', [
      transition(':enter', [style({ opacity: 0 }), animate('200ms', style({ opacity: 1 }))]),
      transition(':leave', [animate('150ms', style({ opacity: 0 }))])
    ])
  ]
})
export class ToothViewerComponent implements AfterViewInit, OnDestroy {
  @ViewChild('toothCanvas') canvasRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('container')   containerRef!: ElementRef<HTMLDivElement>;

  hoveredZone: string | null = null;
  zoneLabels = [
    { name: 'Crown',  color: 'rgba(20,184,166,0.25)' },
    { name: 'Enamel', color: 'rgba(59,130,246,0.25)' },
    { name: 'Root',   color: 'rgba(168,85,247,0.25)' },
  ];

  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private animId!: number;
  private clock = new THREE.Clock();
  private raycaster = new THREE.Raycaster();
  private mouse = new THREE.Vector2(-99, -99);
  private zones: ToothZone[] = [];
  private toothGroup!: THREE.Group;

  constructor(private ngZone: NgZone) {}

  ngAfterViewInit(): void {
    this.initScene();
    this.ngZone.runOutsideAngular(() => this.animate());
  }

  private initScene(): void {
    const canvas = this.canvasRef.nativeElement;
    const w = canvas.clientWidth || 400;
    const h = canvas.clientHeight || 320;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(50, w / h, 0.1, 100);
    this.camera.position.set(0, 1, 8);

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    this.renderer.setSize(w, h);
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    this.renderer.setClearColor(0x000000, 0);

    // Lighting
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.5));
    const key = new THREE.PointLight(0x14b8a6, 60, 30);
    key.position.set(4, 6, 6);
    this.scene.add(key);
    const fill = new THREE.PointLight(0x3b82f6, 30, 20);
    fill.position.set(-4, -2, 4);
    this.scene.add(fill);

    this.buildTooth();
  }

  private buildTooth(): void {
    this.toothGroup = new THREE.Group();

    // ── Crown zone ──
    const crownMat = new THREE.MeshPhysicalMaterial({
      color: 0xd4f1f4, metalness: 0.05, roughness: 0.2,
      transmission: 0.3, thickness: 0.8, transparent: true, opacity: 0.95
    });
    const crownGeo = new THREE.SphereGeometry(1.5, 64, 64);
    crownGeo.scale(1, 0.78, 1);
    const crown = new THREE.Mesh(crownGeo, crownMat);
    crown.position.y = 0.5;
    this.zones.push({ name: 'Crown', mesh: crown, color: 0x14b8a6, hovered: false });
    this.toothGroup.add(crown);

    // Cusps
    const cuspMat = crownMat.clone();
    [[-0.65, 1.2, -0.65], [0.65, 1.2, -0.65], [-0.65, 1.2, 0.65], [0.65, 1.2, 0.65]].forEach(([x, y, z]) => {
      const c = new THREE.Mesh(new THREE.SphereGeometry(0.38, 32, 32), cuspMat);
      c.position.set(x, y, z);
      this.zones.push({ name: 'Crown', mesh: c, color: 0x14b8a6, hovered: false });
      this.toothGroup.add(c);
    });

    // ── Enamel band ──
    const enamelMat = new THREE.MeshPhysicalMaterial({
      color: 0x93c5fd, metalness: 0.1, roughness: 0.3,
      transparent: true, opacity: 0.7
    });
    const enamel = new THREE.Mesh(new THREE.CylinderGeometry(1.3, 1.1, 0.5, 48), enamelMat);
    enamel.position.y = -0.55;
    this.zones.push({ name: 'Enamel', mesh: enamel, color: 0x3b82f6, hovered: false });
    this.toothGroup.add(enamel);

    // ── Roots ──
    const rootMat = new THREE.MeshPhysicalMaterial({
      color: 0xc4b5fd, metalness: 0.05, roughness: 0.4,
      transparent: true, opacity: 0.85
    });
    [[-0.5, 0], [0.5, 0], [0, 0.45]].forEach(([x, z]) => {
      const root = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.05, 2, 24), rootMat);
      root.position.set(x, -1.8, z);
      this.zones.push({ name: 'Root', mesh: root, color: 0xa855f7, hovered: false });
      this.toothGroup.add(root);
    });

    // Wireframe overlay
    const wire = new THREE.Mesh(
      new THREE.SphereGeometry(1.55, 14, 14),
      new THREE.MeshBasicMaterial({ color: 0x14b8a6, wireframe: true, transparent: true, opacity: 0.06 })
    );
    wire.scale.y = 0.78;
    wire.position.y = 0.5;
    this.toothGroup.add(wire);

    this.scene.add(this.toothGroup);
  }

  private animate(): void {
    this.animId = requestAnimationFrame(() => this.animate());
    const t = this.clock.getElapsedTime();

    // Floating + slow rotation
    this.toothGroup.position.y = Math.sin(t * 0.7) * 0.12;
    this.toothGroup.rotation.y = t * 0.3;

    // Raycasting for hover
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const meshes = this.zones.map(z => z.mesh);
    const hits = this.raycaster.intersectObjects(meshes);

    this.zones.forEach(z => {
      const mat = z.mesh.material as THREE.MeshPhysicalMaterial;
      const isHit = hits.length > 0 && hits[0].object === z.mesh;
      if (isHit && !z.hovered) {
        z.hovered = true;
        mat.emissive = new THREE.Color(z.color);
        mat.emissiveIntensity = 0.45;
        this.ngZone.run(() => this.hoveredZone = z.name);
      } else if (!isHit && z.hovered) {
        z.hovered = false;
        mat.emissiveIntensity = 0;
        this.ngZone.run(() => {
          if (!this.zones.some(zz => zz.hovered)) this.hoveredZone = null;
        });
      }
    });

    this.renderer.render(this.scene, this.camera);
  }

  @HostListener('mousemove', ['$event'])
  onMouseMove(e: MouseEvent): void {
    const rect = this.canvasRef.nativeElement.getBoundingClientRect();
    this.mouse.x =  ((e.clientX - rect.left) / rect.width)  * 2 - 1;
    this.mouse.y = -((e.clientY - rect.top)  / rect.height) * 2 + 1;
  }

  @HostListener('mouseleave')
  onMouseLeave(): void { this.mouse.set(-99, -99); }

  ngOnDestroy(): void {
    cancelAnimationFrame(this.animId);
    this.renderer?.dispose();
  }
}
