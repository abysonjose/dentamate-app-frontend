import { Component, OnInit, AfterViewInit, OnDestroy, ViewChild, ElementRef, NgZone, HostListener } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { trigger, transition, style, animate, query, stagger } from '@angular/animations';
import * as THREE from 'three';
import {
  DashboardDataService, LabReport,
  VisitRecord, VisitGroup, MedicationItem
} from '../../../../core/services/dashboard-data.service';

@Component({
  selector: 'app-medical-records',
  templateUrl: './medical-records.component.html',
  styleUrls: ['./medical-records.component.scss'],
  animations: [
    trigger('listAnim', [
      transition('* => *', [
        query(':enter', [
          style({ opacity: 0, transform: 'translateX(-12px)' }),
          stagger(60, [animate('280ms ease', style({ opacity: 1, transform: 'translateX(0)' }))])
        ], { optional: true })
      ])
    ]),
    trigger('detailSlide', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateX(20px)' }),
        animate('300ms cubic-bezier(0.35,0,0.25,1)', style({ opacity: 1, transform: 'translateX(0)' }))
      ]),
      transition(':leave', [
        animate('180ms ease', style({ opacity: 0, transform: 'translateX(20px)' }))
      ])
    ]),
    trigger('fadeIn', [
      transition(':enter', [style({ opacity: 0 }), animate('220ms ease', style({ opacity: 1 }))])
    ])
  ]
})
export class MedicalRecordsComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('folderCanvas') canvasRef!: ElementRef<HTMLCanvasElement>;

  activeTab: 'prescriptions' | 'labs' = 'prescriptions';

  // ── Lab reports ────────────────────────────────────────────────────────────
  labReports: LabReport[] = [];
  loadingLab = true;

  // ── Prescription history ───────────────────────────────────────────────────
  allRecords: VisitRecord[] = [];
  filteredGroups: VisitGroup[] = [];
  selectedRecord: VisitRecord | null = null;
  loadingRx = true;
  printMode = false;
  doctorNames: string[] = [];
  filterForm: FormGroup;

  // ── Three.js ───────────────────────────────────────────────────────────────
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private folderGroup!: THREE.Group;
  private animId!: number;
  private clock = new THREE.Clock();
  private scrollY = 0;

  constructor(private data: DashboardDataService, private fb: FormBuilder, private ngZone: NgZone) {
    this.filterForm = this.fb.group({ doctor: [''], dateFrom: [''], dateTo: [''] });
  }

  ngOnInit(): void {
    this.data.getLabReports().subscribe(l => { this.labReports = l; this.loadingLab = false; });
    this.data.getVisitHistory().subscribe(records => {
      this.allRecords = records;
      this.doctorNames = [...new Set(records.map(r => r.doctorName))];
      this.applyFilter();
      this.loadingRx = false;
    });
    this.filterForm.valueChanges.subscribe(() => this.applyFilter());
  }

  ngAfterViewInit(): void {
    this.initThree();
    this.ngZone.runOutsideAngular(() => this.animateThree());
  }

  // ── Filter ─────────────────────────────────────────────────────────────────
  applyFilter(): void {
    const { doctor, dateFrom, dateTo } = this.filterForm.value;
    let filtered = [...this.allRecords];
    if (doctor)   filtered = filtered.filter(r => r.doctorName === doctor);
    if (dateFrom) filtered = filtered.filter(r => r.visitDate >= dateFrom);
    if (dateTo)   filtered = filtered.filter(r => r.visitDate <= dateTo);
    filtered.sort((a, b) => b.visitDate.localeCompare(a.visitDate));
    const groups = new Map<string, VisitRecord[]>();
    filtered.forEach(r => {
      if (!groups.has(r.visitDate)) groups.set(r.visitDate, []);
      groups.get(r.visitDate)!.push(r);
    });
    this.filteredGroups = Array.from(groups.entries()).map(([date, records]) => ({ date, records }));
  }

  clearFilters(): void { this.filterForm.reset({ doctor: '', dateFrom: '', dateTo: '' }); }

  selectRecord(r: VisitRecord): void {
    this.selectedRecord = this.selectedRecord?.visitId === r.visitId ? null : r;
  }

  // ── Helpers ────────────────────────────────────────────────────────────────
  formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  }
  formatShortDate(iso: string): string {
    return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  }
  getDoctorInitials(name: string): string {
    return name.split(' ').filter(p => p !== 'Dr.').map(p => p[0]).join('').slice(0, 2).toUpperCase();
  }
  hasLabReady(r: VisitRecord): boolean { return r.labTests.some(l => l.status === 'ready'); }

  sigDoses(med: MedicationItem): { label: string; icon: string; active: boolean }[] {
    return [
      { label: 'Morning',   icon: '🌅', active: med.sig.morning   },
      { label: 'Afternoon', icon: '☀️', active: med.sig.afternoon },
      { label: 'Night',     icon: '🌙', active: med.sig.night     },
    ];
  }

  download(report: LabReport): void {
    if (report.status === 'ready') alert(`Downloading: ${report.name}`);
  }

  printPrescription(): void {
    this.printMode = true;
    setTimeout(() => { window.print(); this.printMode = false; }, 100);
  }

  // ── Three.js folder icon ───────────────────────────────────────────────────
  private initThree(): void {
    const canvas = this.canvasRef.nativeElement;
    this.scene  = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(45, 1, 0.1, 50);
    this.camera.position.set(0, 0, 5);
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    this.renderer.setSize(72, 72);
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    this.renderer.setClearColor(0x000000, 0);
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.6));
    const key = new THREE.PointLight(0x14b8a6, 40, 20);
    key.position.set(3, 4, 4);
    this.scene.add(key);
    this.scene.add(new THREE.PointLight(0x3b82f6, 20, 15)).position.set(-3, -2, 3);
    this.buildFolder();
  }

  private buildFolder(): void {
    this.folderGroup = new THREE.Group();
    const mat     = new THREE.MeshPhysicalMaterial({ color: 0x0d9488, metalness: 0.2, roughness: 0.3, transparent: true, opacity: 0.92 });
    const tabMat  = new THREE.MeshPhysicalMaterial({ color: 0x14b8a6, metalness: 0.15, roughness: 0.25 });
    const paperMat = new THREE.MeshPhysicalMaterial({ color: 0xf0fdfa, roughness: 0.8, transparent: true, opacity: 0.95 });
    this.folderGroup.add(new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.4, 0.08), mat));
    const tab = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.18, 0.09), tabMat);
    tab.position.set(-0.55, 0.79, 0);
    this.folderGroup.add(tab);
    [0.06, 0.03, 0].forEach((z, i) => {
      const p = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.1, 0.02), paperMat);
      p.position.set(0.04 * i, -0.02, z + 0.05);
      this.folderGroup.add(p);
    });
    const crossMat = new THREE.MeshBasicMaterial({ color: 0x0d9488 });
    const hBar = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.08, 0.01), crossMat);
    hBar.position.set(0, 0, 0.16);
    const vBar = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.4, 0.01), crossMat);
    vBar.position.set(0, 0, 0.16);
    this.folderGroup.add(hBar, vBar);
    const lineMat = new THREE.MeshBasicMaterial({ color: 0xccfbf1, transparent: true, opacity: 0.6 });
    [-0.25, -0.1, 0.05, 0.2].forEach(y => {
      const l = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.025, 0.01), lineMat);
      l.position.set(0.1, y, 0.17);
      this.folderGroup.add(l);
    });
    this.scene.add(this.folderGroup);
  }

  private animateThree(): void {
    this.animId = requestAnimationFrame(() => this.animateThree());
    const t = this.clock.getElapsedTime();
    const s = Math.min(this.scrollY / 400, 1);
    this.folderGroup.rotation.y = t * 0.5 + s * 0.4;
    this.folderGroup.rotation.x = Math.sin(t * 0.4) * 0.15 + s * 0.2;
    this.folderGroup.position.y = Math.sin(t * 0.7) * 0.08;
    this.renderer.render(this.scene, this.camera);
  }

  @HostListener('window:scroll')
  onScroll(): void { this.scrollY = window.scrollY || document.documentElement.scrollTop; }

  ngOnDestroy(): void { cancelAnimationFrame(this.animId); this.renderer?.dispose(); }
}
