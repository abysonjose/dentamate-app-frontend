import { Component, OnInit, OnDestroy, ElementRef, ViewChild, NgZone } from '@angular/core';
import * as THREE from 'three';
import { CashierDataService } from '../../../../core/services/cashier-data.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-cashier-pulse3d',
  templateUrl: './cashier-pulse3d.component.html',
  styleUrls: ['./cashier-pulse3d.component.scss']
})
export class CashierPulse3dComponent implements OnInit, OnDestroy {
  @ViewChild('canvas3d', { static: true }) canvasRef!: ElementRef<HTMLCanvasElement>;

  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private animId!: number;
  private clock = new THREE.Clock();

  // 3D objects
  private coinGroup!: THREE.Group;
  private vaultGroup!: THREE.Group;
  private particles!: THREE.Points;
  private pulseRings: THREE.Mesh[] = [];

  // State
  private mouseX = 0;
  private mouseY = 0;
  private celebrating = false;
  private celebrateTimer = 0;
  private sub!: Subscription;

  recentPayment: string | null = null;
  stats = { paid: 0, pending: 0, total: 0 };

  constructor(private ngZone: NgZone, private cashierData: CashierDataService) {}

  ngOnInit(): void {
    this.cashierData.getTotals().subscribe(t => this.stats = t);
    this.initThree();
    this.sub = this.cashierData.paymentConfirmed$.subscribe(patientId => {
      this.recentPayment = patientId;
      this.triggerCelebration();
      setTimeout(() => this.recentPayment = null, 4000);
    });
  }

  ngOnDestroy(): void {
    cancelAnimationFrame(this.animId);
    this.renderer?.dispose();
    this.sub?.unsubscribe();
  }

  private initThree(): void {
    const canvas = this.canvasRef.nativeElement;
    const w = canvas.clientWidth || 800;
    const h = canvas.clientHeight || 500;

    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x020c18, 0.025);

    this.camera = new THREE.PerspectiveCamera(55, w / h, 0.1, 200);
    this.camera.position.set(0, 0, 14);

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    this.renderer.setSize(w, h);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.3;

    // Lighting
    this.scene.add(new THREE.AmbientLight(0x0d9488, 0.5));
    const teal = new THREE.PointLight(0x14b8a6, 80, 40);
    teal.position.set(-6, 4, 6);
    this.scene.add(teal);
    const blue = new THREE.PointLight(0x3b82f6, 60, 40);
    blue.position.set(6, -4, 4);
    this.scene.add(blue);
    const gold = new THREE.PointLight(0xfbbf24, 40, 30);
    gold.position.set(0, 6, 2);
    this.scene.add(gold);

    this.buildCoin();
    this.buildVault();
    this.buildPulseRings();
    this.buildParticles();

    canvas.addEventListener('mousemove', (e) => {
      const rect = canvas.getBoundingClientRect();
      this.mouseX = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
      this.mouseY = -((e.clientY - rect.top) / rect.height - 0.5) * 2;
    });

    window.addEventListener('resize', () => this.onResize());

    this.ngZone.runOutsideAngular(() => this.animate());
  }

  private buildCoin(): void {
    this.coinGroup = new THREE.Group();

    const mat = new THREE.MeshPhysicalMaterial({
      color: 0xfbbf24, metalness: 0.9, roughness: 0.1,
      envMapIntensity: 2, emissive: 0xf59e0b, emissiveIntensity: 0.15
    });

    // Coin body (flat cylinder)
    const coinGeo = new THREE.CylinderGeometry(2.2, 2.2, 0.35, 64);
    const coin = new THREE.Mesh(coinGeo, mat);
    this.coinGroup.add(coin);

    // Dollar sign emboss
    const embossMat = new THREE.MeshPhysicalMaterial({
      color: 0xd97706, metalness: 0.95, roughness: 0.05
    });
    const embossGeo = new THREE.TorusGeometry(1.5, 0.06, 8, 48);
    const emboss = new THREE.Mesh(embossGeo, embossMat);
    emboss.rotation.x = Math.PI / 2;
    emboss.position.y = 0.2;
    this.coinGroup.add(emboss);

    // Rim edge
    const rimGeo = new THREE.TorusGeometry(2.2, 0.08, 8, 64);
    const rim = new THREE.Mesh(rimGeo, embossMat);
    rim.rotation.x = Math.PI / 2;
    this.coinGroup.add(rim);

    // Wireframe overlay
    const wireMat = new THREE.MeshBasicMaterial({ color: 0xfbbf24, wireframe: true, transparent: true, opacity: 0.06 });
    this.coinGroup.add(new THREE.Mesh(new THREE.CylinderGeometry(2.25, 2.25, 0.4, 16), wireMat));

    this.coinGroup.position.set(-3.5, 0, 0);
    this.coinGroup.rotation.x = 0.3;
    this.scene.add(this.coinGroup);
  }

  private buildVault(): void {
    this.vaultGroup = new THREE.Group();

    const mat = new THREE.MeshPhysicalMaterial({
      color: 0x1e40af, metalness: 0.8, roughness: 0.2,
      emissive: 0x0d9488, emissiveIntensity: 0.1
    });

    // Vault body
    const bodyGeo = new THREE.BoxGeometry(3, 3.5, 1.2);
    const body = new THREE.Mesh(bodyGeo, mat);
    this.vaultGroup.add(body);

    // Door circle
    const doorMat = new THREE.MeshPhysicalMaterial({ color: 0x374151, metalness: 0.9, roughness: 0.1 });
    const doorGeo = new THREE.CylinderGeometry(1.1, 1.1, 0.15, 32);
    const door = new THREE.Mesh(doorGeo, doorMat);
    door.rotation.x = Math.PI / 2;
    door.position.z = 0.65;
    this.vaultGroup.add(door);

    // Handle
    const handleMat = new THREE.MeshPhysicalMaterial({ color: 0xfbbf24, metalness: 0.95, roughness: 0.05 });
    const handleGeo = new THREE.TorusGeometry(0.45, 0.07, 8, 24);
    const handle = new THREE.Mesh(handleGeo, handleMat);
    handle.position.z = 0.75;
    this.vaultGroup.add(handle);

    // Spokes
    for (let i = 0; i < 4; i++) {
      const spokeGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.9, 8);
      const spoke = new THREE.Mesh(spokeGeo, handleMat);
      spoke.rotation.z = (i * Math.PI) / 2;
      spoke.position.z = 0.75;
      this.vaultGroup.add(spoke);
    }

    // Bolts
    const boltMat = new THREE.MeshPhysicalMaterial({ color: 0x9ca3af, metalness: 0.9, roughness: 0.1 });
    [[-1.2, 1.4], [1.2, 1.4], [-1.2, -1.4], [1.2, -1.4]].forEach(([x, y]) => {
      const bolt = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.2, 12), boltMat);
      bolt.rotation.x = Math.PI / 2;
      bolt.position.set(x, y, 0.65);
      this.vaultGroup.add(bolt);
    });

    this.vaultGroup.position.set(3.5, 0, 0);
    this.scene.add(this.vaultGroup);
  }

  private buildPulseRings(): void {
    for (let i = 0; i < 3; i++) {
      const geo = new THREE.TorusGeometry(3 + i * 1.5, 0.04, 8, 64);
      const mat = new THREE.MeshBasicMaterial({
        color: 0x0d9488, transparent: true, opacity: 0.3 - i * 0.08
      });
      const ring = new THREE.Mesh(geo, mat);
      ring.rotation.x = Math.PI / 2;
      ring.position.y = -3;
      this.scene.add(ring);
      this.pulseRings.push(ring);
    }
  }

  private buildParticles(): void {
    const count = 280;
    const pos = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3]     = (Math.random() - 0.5) * 30;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 20;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 20;
      const t = Math.random();
      colors[i * 3]     = t < 0.5 ? 0.05 : 0.98;
      colors[i * 3 + 1] = t < 0.5 ? 0.58 : 0.75;
      colors[i * 3 + 2] = t < 0.5 ? 0.53 : 0.14;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    this.particles = new THREE.Points(geo, new THREE.PointsMaterial({
      size: 0.08, vertexColors: true, transparent: true, opacity: 0.7
    }));
    this.scene.add(this.particles);
  }

  private triggerCelebration(): void {
    this.celebrating = true;
    this.celebrateTimer = 3;
  }

  private animate(): void {
    this.animId = requestAnimationFrame(() => this.animate());
    const t = this.clock.getElapsedTime();
    const delta = 0.016;

    // Coin rotation + float
    if (this.coinGroup) {
      this.coinGroup.rotation.y = t * 0.8;
      this.coinGroup.position.y = Math.sin(t * 1.2) * 0.4;
      if (this.celebrating) {
        this.coinGroup.rotation.y = t * 3;
        this.coinGroup.position.y = Math.sin(t * 4) * 0.8;
      }
    }

    // Vault gentle sway
    if (this.vaultGroup) {
      this.vaultGroup.rotation.y = Math.sin(t * 0.5) * 0.15 + this.mouseX * 0.08;
      this.vaultGroup.position.y = Math.sin(t * 0.8 + 1) * 0.25;
    }

    // Pulse rings
    this.pulseRings.forEach((ring, i) => {
      const scale = 1 + Math.sin(t * 1.5 + i * 1.2) * 0.08;
      ring.scale.set(scale, scale, scale);
      (ring.material as THREE.MeshBasicMaterial).opacity =
        this.celebrating ? 0.6 + Math.sin(t * 6 + i) * 0.3 : 0.2 + Math.sin(t * 1.5 + i) * 0.1;
    });

    // Particles drift
    if (this.particles) {
      this.particles.rotation.y = t * 0.03;
      this.particles.rotation.x = t * 0.01;
    }

    // Mouse parallax on scene
    this.scene.rotation.y += (this.mouseX * 0.05 - this.scene.rotation.y) * 0.05;
    this.scene.rotation.x += (this.mouseY * 0.03 - this.scene.rotation.x) * 0.05;

    // Celebration countdown
    if (this.celebrating) {
      this.celebrateTimer -= 0.016;
      if (this.celebrateTimer <= 0) this.celebrating = false;
    }

    this.renderer.render(this.scene, this.camera);
  }

  private onResize(): void {
    const canvas = this.canvasRef.nativeElement;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }
}
