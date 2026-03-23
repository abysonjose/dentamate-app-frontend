import {
  Component, AfterViewInit, OnDestroy, ViewChild, ElementRef, NgZone, HostListener
} from '@angular/core';
import * as THREE from 'three';
import { trigger, transition, style, animate } from '@angular/animations';

interface ToothData {
  number: number;       // FDI notation
  name: string;
  position: [number, number, number];
  mesh?: THREE.Mesh;
  selected: boolean;
  condition: 'healthy' | 'caries' | 'missing' | 'treated' | 'crown';
  notes: string;
}

@Component({
  selector: 'app-doc-dental-chart',
  templateUrl: './doc-dental-chart.component.html',
  styleUrls: ['./doc-dental-chart.component.scss'],
  animations: [
    trigger('fadeIn', [
      transition(':enter', [style({ opacity: 0 }), animate('200ms', style({ opacity: 1 }))]),
      transition(':leave', [animate('150ms', style({ opacity: 0 }))])
    ])
  ]
})
export class DocDentalChartComponent implements AfterViewInit, OnDestroy {
  @ViewChild('dentalCanvas') canvasRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('container')    containerRef!: ElementRef<HTMLDivElement>;

  selectedTooth: ToothData | null = null;
  hoveredTooth: ToothData | null = null;
  noteInput = '';
  conditionInput: ToothData['condition'] = 'healthy';

  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private animId!: number;
  private raycaster = new THREE.Raycaster();
  private mouse = new THREE.Vector2(-99, -99);
  private clock = new THREE.Clock();
  private toothMeshes: THREE.Mesh[] = [];

  // FDI tooth chart — upper right (1x), upper left (2x), lower left (3x), lower right (4x)
  teeth: ToothData[] = [
    // Upper right (18–11)
    { number: 18, name: 'UR Wisdom',    position: [-7.0, 1.2, 0], selected: false, condition: 'healthy', notes: '' },
    { number: 17, name: 'UR 2nd Molar', position: [-5.6, 1.2, 0], selected: false, condition: 'healthy', notes: '' },
    { number: 16, name: 'UR 1st Molar', position: [-4.2, 1.2, 0], selected: false, condition: 'caries',  notes: 'Occlusal caries' },
    { number: 15, name: 'UR 2nd Premolar', position: [-3.0, 1.0, 0], selected: false, condition: 'healthy', notes: '' },
    { number: 14, name: 'UR 1st Premolar', position: [-2.0, 0.9, 0], selected: false, condition: 'treated', notes: 'Composite filling' },
    { number: 13, name: 'UR Canine',    position: [-1.1, 0.7, 0], selected: false, condition: 'healthy', notes: '' },
    { number: 12, name: 'UR Lateral',   position: [-0.55, 0.5, 0], selected: false, condition: 'healthy', notes: '' },
    { number: 11, name: 'UR Central',   position: [-0.1, 0.4, 0], selected: false, condition: 'healthy', notes: '' },
    // Upper left (21–28)
    { number: 21, name: 'UL Central',   position: [0.1, 0.4, 0],  selected: false, condition: 'crown',   notes: 'PFM Crown' },
    { number: 22, name: 'UL Lateral',   position: [0.55, 0.5, 0], selected: false, condition: 'healthy', notes: '' },
    { number: 23, name: 'UL Canine',    position: [1.1, 0.7, 0],  selected: false, condition: 'healthy', notes: '' },
    { number: 24, name: 'UL 1st Premolar', position: [2.0, 0.9, 0], selected: false, condition: 'healthy', notes: '' },
    { number: 25, name: 'UL 2nd Premolar', position: [3.0, 1.0, 0], selected: false, condition: 'healthy', notes: '' },
    { number: 26, name: 'UL 1st Molar', position: [4.2, 1.2, 0],  selected: false, condition: 'healthy', notes: '' },
    { number: 27, name: 'UL 2nd Molar', position: [5.6, 1.2, 0],  selected: false, condition: 'healthy', notes: '' },
    { number: 28, name: 'UL Wisdom',    position: [7.0, 1.2, 0],  selected: false, condition: 'missing', notes: 'Extracted' },
    // Lower left (31–38)
    { number: 31, name: 'LL Central',   position: [-0.1, -0.4, 0], selected: false, condition: 'healthy', notes: '' },
    { number: 32, name: 'LL Lateral',   position: [-0.55, -0.5, 0], selected: false, condition: 'healthy', notes: '' },
    { number: 33, name: 'LL Canine',    position: [-1.1, -0.7, 0], selected: false, condition: 'healthy', notes: '' },
    { number: 34, name: 'LL 1st Premolar', position: [-2.0, -0.9, 0], selected: false, condition: 'healthy', notes: '' },
    { number: 35, name: 'LL 2nd Premolar', position: [-3.0, -1.0, 0], selected: false, condition: 'healthy', notes: '' },
    { number: 36, name: 'LL 1st Molar', position: [-4.2, -1.2, 0], selected: false, condition: 'treated', notes: 'RCT done' },
    { number: 37, name: 'LL 2nd Molar', position: [-5.6, -1.2, 0], selected: false, condition: 'healthy', notes: '' },
    { number: 38, name: 'LL Wisdom',    position: [-7.0, -1.2, 0], selected: false, condition: 'healthy', notes: '' },
    // Lower right (41–48)
    { number: 41, name: 'LR Central',   position: [0.1, -0.4, 0],  selected: false, condition: 'healthy', notes: '' },
    { number: 42, name: 'LR Lateral',   position: [0.55, -0.5, 0], selected: false, condition: 'healthy', notes: '' },
    { number: 43, name: 'LR Canine',    position: [1.1, -0.7, 0],  selected: false, condition: 'healthy', notes: '' },
    { number: 44, name: 'LR 1st Premolar', position: [2.0, -0.9, 0], selected: false, condition: 'healthy', notes: '' },
    { number: 45, name: 'LR 2nd Premolar', position: [3.0, -1.0, 0], selected: false, condition: 'healthy', notes: '' },
    { number: 46, name: 'LR 1st Molar', position: [4.2, -1.2, 0],  selected: false, condition: 'caries',  notes: 'Mesial caries' },
    { number: 47, name: 'LR 2nd Molar', position: [5.6, -1.2, 0],  selected: false, condition: 'healthy', notes: '' },
    { number: 48, name: 'LR Wisdom',    position: [7.0, -1.2, 0],  selected: false, condition: 'healthy', notes: '' },
  ];

  conditionColors: Record<ToothData['condition'], number> = {
    healthy: 0xd4f1f4,
    caries:  0xf87171,
    missing: 0x374151,
    treated: 0x4ade80,
    crown:   0xfbbf24,
  };

  conditions: ToothData['condition'][] = ['healthy', 'caries', 'missing', 'treated', 'crown'];

  constructor(private ngZone: NgZone) {}

  ngAfterViewInit(): void {
    this.initScene();
    this.ngZone.runOutsideAngular(() => this.animate());
  }

  private initScene(): void {
    const canvas = this.canvasRef.nativeElement;
    const w = canvas.clientWidth || 700;
    const h = canvas.clientHeight || 340;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 100);
    this.camera.position.set(0, 0, 14);

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    this.renderer.setSize(w, h);
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    this.renderer.setClearColor(0x000000, 0);

    // Lighting
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.6));
    const key = new THREE.PointLight(0x14b8a6, 80, 40);
    key.position.set(0, 6, 8);
    this.scene.add(key);
    const fill = new THREE.PointLight(0x3b82f6, 40, 30);
    fill.position.set(-6, -4, 6);
    this.scene.add(fill);

    // Arch guide lines
    this.buildArchGuides();
    this.buildTeeth();
  }

  private buildArchGuides(): void {
    const mat = new THREE.LineBasicMaterial({ color: 0x1e3a5f, transparent: true, opacity: 0.4 });
    // Upper arch
    const upperPts: THREE.Vector3[] = [];
    for (let i = 0; i <= 60; i++) {
      const t = (i / 60) * Math.PI;
      upperPts.push(new THREE.Vector3(Math.cos(t) * 7.5 - 0, Math.sin(t) * 1.5 + 0.3, -0.5));
    }
    this.scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(upperPts), mat));
    // Lower arch
    const lowerPts: THREE.Vector3[] = [];
    for (let i = 0; i <= 60; i++) {
      const t = (i / 60) * Math.PI;
      lowerPts.push(new THREE.Vector3(Math.cos(t) * 7.5 - 0, -(Math.sin(t) * 1.5 + 0.3), -0.5));
    }
    this.scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(lowerPts), mat));
    // Midline
    const midMat = new THREE.LineBasicMaterial({ color: 0x0d9488, transparent: true, opacity: 0.3 });
    this.scene.add(new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, -2, 0), new THREE.Vector3(0, 2, 0)]),
      midMat
    ));
  }

  private buildTeeth(): void {
    this.teeth.forEach(tooth => {
      const isMolar = tooth.number % 10 >= 6;
      const isPremolar = tooth.number % 10 === 4 || tooth.number % 10 === 5;
      const isIncisor = tooth.number % 10 <= 2;

      let geo: THREE.BufferGeometry;
      if (isMolar) {
        geo = new THREE.BoxGeometry(0.9, 0.7, 0.6);
      } else if (isPremolar) {
        geo = new THREE.BoxGeometry(0.7, 0.65, 0.55);
      } else if (isIncisor) {
        geo = new THREE.BoxGeometry(0.55, 0.6, 0.45);
      } else {
        // Canine
        geo = new THREE.ConeGeometry(0.3, 0.7, 6);
      }

      const color = this.conditionColors[tooth.condition];
      const mat = new THREE.MeshPhysicalMaterial({
        color,
        metalness: 0.05,
        roughness: tooth.condition === 'missing' ? 0.9 : 0.25,
        transparent: tooth.condition === 'missing',
        opacity: tooth.condition === 'missing' ? 0.3 : 1,
      });

      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(...tooth.position);
      mesh.userData = { toothNumber: tooth.number };
      tooth.mesh = mesh;
      this.toothMeshes.push(mesh);
      this.scene.add(mesh);
    });
  }

  private animate(): void {
    this.animId = requestAnimationFrame(() => this.animate());
    const t = this.clock.getElapsedTime();

    // Gentle float
    this.scene.position.y = Math.sin(t * 0.4) * 0.05;

    // Raycasting
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const hits = this.raycaster.intersectObjects(this.toothMeshes);

    this.toothMeshes.forEach(mesh => {
      const tooth = this.teeth.find(t => t.number === mesh.userData['toothNumber']);
      if (!tooth) return;
      const mat = mesh.material as THREE.MeshPhysicalMaterial;
      const isHit = hits.length > 0 && hits[0].object === mesh;
      const baseColor = this.conditionColors[tooth.condition];

      if (tooth.selected) {
        mat.emissive = new THREE.Color(0x14b8a6);
        mat.emissiveIntensity = 0.5 + Math.sin(t * 3) * 0.15;
      } else if (isHit) {
        mat.emissive = new THREE.Color(0xffffff);
        mat.emissiveIntensity = 0.2;
        if (!this.hoveredTooth || this.hoveredTooth.number !== tooth.number) {
          this.ngZone.run(() => this.hoveredTooth = tooth);
        }
      } else {
        mat.emissive = new THREE.Color(0x000000);
        mat.emissiveIntensity = 0;
        if (this.hoveredTooth?.number === tooth.number && !isHit) {
          this.ngZone.run(() => this.hoveredTooth = null);
        }
      }
    });

    this.renderer.render(this.scene, this.camera);
  }

  @HostListener('click', ['$event'])
  onClick(e: MouseEvent): void {
    const rect = this.canvasRef.nativeElement.getBoundingClientRect();
    const mx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const my = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    const ray = new THREE.Raycaster();
    ray.setFromCamera(new THREE.Vector2(mx, my), this.camera);
    const hits = ray.intersectObjects(this.toothMeshes);
    if (hits.length) {
      const num = hits[0].object.userData['toothNumber'];
      const tooth = this.teeth.find(t => t.number === num);
      if (tooth) {
        this.ngZone.run(() => {
          this.selectedTooth = tooth;
          this.noteInput = tooth.notes;
          this.conditionInput = tooth.condition;
        });
      }
    }
  }

  @HostListener('mousemove', ['$event'])
  onMouseMove(e: MouseEvent): void {
    const rect = this.canvasRef.nativeElement.getBoundingClientRect();
    this.mouse.x =  ((e.clientX - rect.left) / rect.width)  * 2 - 1;
    this.mouse.y = -((e.clientY - rect.top)  / rect.height) * 2 + 1;
  }

  @HostListener('mouseleave')
  onMouseLeave(): void { this.mouse.set(-99, -99); this.hoveredTooth = null; }

  saveToothNote(): void {
    if (!this.selectedTooth) return;
    this.selectedTooth.notes = this.noteInput;
    this.selectedTooth.condition = this.conditionInput;
    // Update mesh color
    if (this.selectedTooth.mesh) {
      const mat = this.selectedTooth.mesh.material as THREE.MeshPhysicalMaterial;
      mat.color.setHex(this.conditionColors[this.conditionInput]);
      mat.transparent = this.conditionInput === 'missing';
      mat.opacity = this.conditionInput === 'missing' ? 0.3 : 1;
    }
    this.selectedTooth = null;
  }

  toggleSelect(tooth: ToothData): void { tooth.selected = !tooth.selected; }

  get selectedTeeth(): ToothData[] { return this.teeth.filter(t => t.selected); }

  conditionLabel(c: ToothData['condition']): string {
    return { healthy: 'Healthy', caries: 'Caries', missing: 'Missing', treated: 'Treated', crown: 'Crown' }[c];
  }

  conditionHex(c: ToothData['condition']): string {
    return { healthy: '#d4f1f4', caries: '#f87171', missing: '#374151', treated: '#4ade80', crown: '#fbbf24' }[c];
  }

  ngOnDestroy(): void {
    cancelAnimationFrame(this.animId);
    this.renderer?.dispose();
  }
}
