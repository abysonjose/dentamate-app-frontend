import { Component, OnInit, OnDestroy, ElementRef, ViewChild, Input } from '@angular/core';
import * as THREE from 'three';
import { LabDataService } from '../../../../core/services/lab-data.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-lab-visualizer',
  templateUrl: './lab-visualizer.component.html',
  styleUrls: ['./lab-visualizer.component.scss']
})
export class LabVisualizerComponent implements OnInit, OnDestroy {
  @ViewChild('canvas', { static: true }) canvasRef!: ElementRef<HTMLCanvasElement>;

  isUploading = false;
  private renderer!: THREE.WebGLRenderer;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private animId!: number;
  private helixGroup!: THREE.Group;
  private glowMeshes: THREE.Mesh[] = [];
  private subs: Subscription[] = [];

  constructor(private labData: LabDataService) {}

  ngOnInit(): void {
    this.initThree();
    this.animate();

    this.subs.push(
      this.labData.uploadProgress$.subscribe(p => {
        this.isUploading = !!p;
        this.updateGlow(!!p);
      })
    );
  }

  private initThree(): void {
    const canvas = this.canvasRef.nativeElement;
    const w = canvas.clientWidth || 500;
    const h = canvas.clientHeight || 420;

    // Renderer
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    this.renderer.setSize(w, h);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // Scene
    this.scene = new THREE.Scene();

    // Camera
    this.camera = new THREE.PerspectiveCamera(50, w / h, 0.1, 100);
    this.camera.position.set(0, 0, 8);

    // Lighting
    const ambient = new THREE.AmbientLight(0xffffff, 0.4);
    this.scene.add(ambient);
    const point1 = new THREE.PointLight(0x14b8a6, 2, 20);
    point1.position.set(3, 3, 3);
    this.scene.add(point1);
    const point2 = new THREE.PointLight(0x3b82f6, 1.5, 20);
    point2.position.set(-3, -3, 3);
    this.scene.add(point2);

    // Build DNA helix
    this.helixGroup = new THREE.Group();
    this.scene.add(this.helixGroup);
    this.buildDNAHelix();

    // Resize observer
    const ro = new ResizeObserver(() => this.onResize());
    ro.observe(canvas);
  }

  private buildDNAHelix(): void {
    const strandMat1 = new THREE.MeshPhongMaterial({ color: 0x14b8a6, shininess: 80, emissive: 0x0d9488, emissiveIntensity: 0.3 });
    const strandMat2 = new THREE.MeshPhongMaterial({ color: 0x3b82f6, shininess: 80, emissive: 0x1d4ed8, emissiveIntensity: 0.3 });
    const rungMat   = new THREE.MeshPhongMaterial({ color: 0xffffff, shininess: 60, transparent: true, opacity: 0.7 });
    const nodeMat1  = new THREE.MeshPhongMaterial({ color: 0x14b8a6, emissive: 0x14b8a6, emissiveIntensity: 0.6 });
    const nodeMat2  = new THREE.MeshPhongMaterial({ color: 0x60a5fa, emissive: 0x60a5fa, emissiveIntensity: 0.6 });

    const turns = 3;
    const steps = 80;
    const radius = 1.2;
    const height = 5;
    const nodeGeo = new THREE.SphereGeometry(0.12, 12, 12);
    const rungGeo = new THREE.CylinderGeometry(0.04, 0.04, 1, 8);

    const strand1Points: THREE.Vector3[] = [];
    const strand2Points: THREE.Vector3[] = [];

    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const angle = t * turns * Math.PI * 2;
      const y = (t - 0.5) * height;

      strand1Points.push(new THREE.Vector3(Math.cos(angle) * radius, y, Math.sin(angle) * radius));
      strand2Points.push(new THREE.Vector3(Math.cos(angle + Math.PI) * radius, y, Math.sin(angle + Math.PI) * radius));

      // Nodes every 8 steps
      if (i % 8 === 0) {
        const n1 = new THREE.Mesh(nodeGeo, nodeMat1);
        n1.position.copy(strand1Points[i]);
        this.helixGroup.add(n1);
        this.glowMeshes.push(n1);

        const n2 = new THREE.Mesh(nodeGeo, nodeMat2);
        n2.position.copy(strand2Points[i]);
        this.helixGroup.add(n2);
        this.glowMeshes.push(n2);

        // Rung connecting the two strands
        const mid = new THREE.Vector3().addVectors(strand1Points[i], strand2Points[i]).multiplyScalar(0.5);
        const rung = new THREE.Mesh(rungGeo, rungMat);
        rung.position.copy(mid);
        const dir = new THREE.Vector3().subVectors(strand2Points[i], strand1Points[i]).normalize();
        rung.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
        rung.scale.y = strand1Points[i].distanceTo(strand2Points[i]);
        this.helixGroup.add(rung);
      }
    }

    // Tube for strand 1
    const curve1 = new THREE.CatmullRomCurve3(strand1Points);
    const tube1 = new THREE.Mesh(new THREE.TubeGeometry(curve1, 120, 0.06, 8, false), strandMat1);
    this.helixGroup.add(tube1);

    // Tube for strand 2
    const curve2 = new THREE.CatmullRomCurve3(strand2Points);
    const tube2 = new THREE.Mesh(new THREE.TubeGeometry(curve2, 120, 0.06, 8, false), strandMat2);
    this.helixGroup.add(tube2);

    // Floating particles
    const particleGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(120);
    for (let i = 0; i < 120; i += 3) {
      positions[i]     = (Math.random() - 0.5) * 6;
      positions[i + 1] = (Math.random() - 0.5) * 6;
      positions[i + 2] = (Math.random() - 0.5) * 4;
    }
    particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const particleMat = new THREE.PointsMaterial({ color: 0x14b8a6, size: 0.06, transparent: true, opacity: 0.6 });
    this.helixGroup.add(new THREE.Points(particleGeo, particleMat));
  }

  private updateGlow(active: boolean): void {
    this.glowMeshes.forEach(m => {
      const mat = m.material as THREE.MeshPhongMaterial;
      mat.emissiveIntensity = active ? 1.5 : 0.6;
    });
  }

  private animate(): void {
    this.animId = requestAnimationFrame(() => this.animate());
    const t = Date.now() * 0.001;
    if (this.helixGroup) {
      this.helixGroup.rotation.y = t * (this.isUploading ? 1.8 : 0.5);
      this.helixGroup.rotation.x = Math.sin(t * 0.3) * 0.08;
    }
    this.renderer.render(this.scene, this.camera);
  }

  private onResize(): void {
    const canvas = this.canvasRef.nativeElement;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (w && h) {
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(w, h);
    }
  }

  ngOnDestroy(): void {
    cancelAnimationFrame(this.animId);
    this.renderer.dispose();
    this.subs.forEach(s => s.unsubscribe());
  }
}
