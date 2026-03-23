import {
  Component, OnInit, OnDestroy, AfterViewInit,
  ElementRef, ViewChild, NgZone
} from '@angular/core';
import * as THREE from 'three';
import { ClinicAdminDataService } from '../../../../core/services/clinic-admin-data.service';

@Component({
  selector: 'app-ca-clinic3d',
  templateUrl: './ca-clinic3d.component.html',
  styleUrls: ['./ca-clinic3d.component.scss']
})
export class CaClinic3dComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('canvas3d') canvasRef!: ElementRef<HTMLCanvasElement>;

  branches: any[] = [];
  private renderer!: THREE.WebGLRenderer;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private bars: THREE.Mesh[] = [];
  private animId = 0;
  private resizeObs!: ResizeObserver;
  private mouse = new THREE.Vector2();
  private raycaster = new THREE.Raycaster();
  hoveredBar: any = null;

  constructor(private data: ClinicAdminDataService, private ngZone: NgZone) {}

  ngOnInit(): void {
    this.data.getBranchRevenue().subscribe(b => { this.branches = b; this.buildBars(); });
  }

  ngAfterViewInit(): void {
    this.ngZone.runOutsideAngular(() => this.initThree());
  }

  private initThree(): void {
    const canvas = this.canvasRef.nativeElement;
    const W = canvas.offsetWidth || 600;
    const H = canvas.offsetHeight || 400;

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(W, H);
    this.renderer.setClearColor(0x000000, 0);

    this.scene = new THREE.Scene();

    this.camera = new THREE.PerspectiveCamera(45, W / H, 0.1, 100);
    this.camera.position.set(0, 6, 12);
    this.camera.lookAt(0, 0, 0);

    // Ambient + directional light
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.6));
    const dir = new THREE.DirectionalLight(0xffffff, 1.2);
    dir.position.set(5, 10, 5);
    this.scene.add(dir);

    // Grid floor
    const grid = new THREE.GridHelper(14, 14, 0x1a3a4a, 0x1a3a4a);
    this.scene.add(grid);

    this.buildBars();
    this.animate();

    this.resizeObs = new ResizeObserver(() => {
      const w = canvas.offsetWidth; const h = canvas.offsetHeight;
      this.renderer.setSize(w, h);
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
    });
    this.resizeObs.observe(canvas.parentElement!);
  }

  private buildBars(): void {
    if (!this.scene || !this.branches.length) return;
    // Remove old bars
    this.bars.forEach(b => this.scene.remove(b));
    this.bars = [];

    const maxRev = Math.max(...this.branches.map(b => b.revenue));
    const colors = [0x14b8a6, 0x3b82f6, 0xa855f7];
    const spacing = 3.5;
    const offset = ((this.branches.length - 1) * spacing) / 2;

    this.branches.forEach((branch, i) => {
      const h = (branch.revenue / maxRev) * 5 + 0.2;
      const geo = new THREE.BoxGeometry(1.8, h, 1.8);
      const mat = new THREE.MeshPhongMaterial({
        color: colors[i % colors.length],
        transparent: true, opacity: 0.88,
        shininess: 80
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(i * spacing - offset, h / 2, 0);
      (mesh as any).branchData = branch;
      this.scene.add(mesh);
      this.bars.push(mesh);

      // Label plane (simple colored marker)
      const labelGeo = new THREE.PlaneGeometry(1.8, 0.4);
      const labelMat = new THREE.MeshBasicMaterial({ color: colors[i % colors.length], transparent: true, opacity: 0.3, side: THREE.DoubleSide });
      const label = new THREE.Mesh(labelGeo, labelMat);
      label.position.set(i * spacing - offset, h + 0.3, 0);
      this.scene.add(label);
    });
  }

  private animate(): void {
    this.animId = requestAnimationFrame(() => this.animate());
    // Slow rotation
    this.bars.forEach((b, i) => {
      b.rotation.y += 0.003;
    });
    this.renderer.render(this.scene, this.camera);
  }

  onMouseMove(e: MouseEvent): void {
    const canvas = this.canvasRef.nativeElement;
    const rect = canvas.getBoundingClientRect();
    this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const hits = this.raycaster.intersectObjects(this.bars);
    if (hits.length) {
      this.ngZone.run(() => this.hoveredBar = (hits[0].object as any).branchData);
    } else {
      this.ngZone.run(() => this.hoveredBar = null);
    }
  }

  ngOnDestroy(): void {
    cancelAnimationFrame(this.animId);
    this.resizeObs?.disconnect();
    this.renderer?.dispose();
  }
}
