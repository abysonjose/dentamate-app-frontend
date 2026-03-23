import { Component, OnInit, OnDestroy, ElementRef, ViewChild, AfterViewInit, NgZone } from '@angular/core';
import * as THREE from 'three';
import { SaasAdminDataService, ServerNode } from '../../../../core/services/saas-admin-data.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-sa-network3d',
  templateUrl: './sa-network3d.component.html',
  styleUrls: ['./sa-network3d.component.scss']
})
export class SaNetwork3dComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('netCanvas') netCanvas!: ElementRef<HTMLCanvasElement>;

  servers: ServerNode[] = [];
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private animId!: number;
  private serverMeshes: Map<string, THREE.Group> = new Map();
  private clock = new THREE.Clock();
  private mouseX = 0; private mouseY = 0;
  private subs: Subscription[] = [];

  constructor(private data: SaasAdminDataService, private ngZone: NgZone) {}

  ngOnInit(): void {
    this.subs.push(this.data.servers$.subscribe(s => {
      this.servers = s;
      this.updateServerColors();
    }));
  }

  ngAfterViewInit(): void { setTimeout(() => this.initScene(), 100); }

  private initScene(): void {
    const canvas = this.netCanvas.nativeElement;
    const W = canvas.clientWidth; const H = canvas.clientHeight;

    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x050a18, 0.025);

    this.camera = new THREE.PerspectiveCamera(55, W / H, 0.1, 300);
    this.camera.position.set(0, 8, 22);

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    this.renderer.setSize(W, H);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;

    // Lighting
    this.scene.add(new THREE.AmbientLight(0x1a0a3a, 0.6));
    const purpleLight = new THREE.PointLight(0xa855f7, 80, 50);
    purpleLight.position.set(-8, 6, 8); this.scene.add(purpleLight);
    const blueLight = new THREE.PointLight(0x3b82f6, 60, 50);
    blueLight.position.set(8, -4, 6); this.scene.add(blueLight);

    this.buildGrid();
    this.buildServerNodes();
    this.buildConnections();
    this.buildParticles();

    canvas.addEventListener('mousemove', (e) => {
      this.mouseX = (e.clientX / window.innerWidth - 0.5) * 2;
      this.mouseY = (e.clientY / window.innerHeight - 0.5) * 2;
    });

    this.ngZone.runOutsideAngular(() => this.animate());
  }

  private buildGrid(): void {
    const gridHelper = new THREE.GridHelper(40, 20, 0x1a0a3a, 0x1a0a3a);
    (gridHelper.material as THREE.Material).opacity = 0.3;
    (gridHelper.material as THREE.Material).transparent = true;
    gridHelper.position.y = -4;
    this.scene.add(gridHelper);
  }

  private getServerPosition(index: number, total: number): THREE.Vector3 {
    const angle = (index / total) * Math.PI * 2;
    const radius = 8;
    return new THREE.Vector3(Math.cos(angle) * radius, 0, Math.sin(angle) * radius);
  }

  private buildServerNodes(): void {
    const positions = [
      new THREE.Vector3(-8, 0, -4), new THREE.Vector3(8, 0, -4),
      new THREE.Vector3(-10, 0, 2), new THREE.Vector3(0, 0, -8),
      new THREE.Vector3(10, 0, 2),  new THREE.Vector3(0, 0, 6),
    ];

    this.servers.forEach((srv, i) => {
      const group = new THREE.Group();
      const pos = positions[i] ?? this.getServerPosition(i, this.servers.length);
      group.position.copy(pos);

      // Server box
      const color = srv.status === 'healthy' ? 0x22c55e : srv.status === 'warning' ? 0xf59e0b : 0xef4444;
      const boxGeo = new THREE.BoxGeometry(1.4, 0.9, 0.6);
      const boxMat = new THREE.MeshPhysicalMaterial({ color, metalness: 0.7, roughness: 0.2, emissive: color, emissiveIntensity: 0.15 });
      const box = new THREE.Mesh(boxGeo, boxMat);
      group.add(box);

      // Glow ring
      const ringGeo = new THREE.TorusGeometry(1.1, 0.04, 8, 32);
      const ringMat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.5 });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = Math.PI / 2;
      group.add(ring);

      // Load bar above server
      const loadBarGeo = new THREE.BoxGeometry((srv.load / 100) * 1.2, 0.08, 0.08);
      const loadBarMat = new THREE.MeshBasicMaterial({ color: srv.load > 80 ? 0xef4444 : 0xa855f7 });
      const loadBar = new THREE.Mesh(loadBarGeo, loadBarMat);
      loadBar.position.set(-(1.2 - (srv.load / 100) * 1.2) / 2, 0.65, 0);
      group.add(loadBar);

      this.scene.add(group);
      this.serverMeshes.set(srv.id, group);
    });
  }

  private buildConnections(): void {
    const positions = [
      new THREE.Vector3(-8, 0, -4), new THREE.Vector3(8, 0, -4),
      new THREE.Vector3(-10, 0, 2), new THREE.Vector3(0, 0, -8),
      new THREE.Vector3(10, 0, 2),  new THREE.Vector3(0, 0, 6),
    ];
    const pairs = [[0,1],[1,4],[0,2],[2,3],[3,1],[4,5],[5,0],[3,4]];
    pairs.forEach(([a, b]) => {
      if (!positions[a] || !positions[b]) return;
      const points = [positions[a], positions[b]];
      const geo = new THREE.BufferGeometry().setFromPoints(points);
      const mat = new THREE.LineBasicMaterial({ color: 0xa855f7, transparent: true, opacity: 0.25 });
      this.scene.add(new THREE.Line(geo, mat));
    });
  }

  private buildParticles(): void {
    const count = 200;
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3]     = (Math.random() - 0.5) * 40;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 20;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 30;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const mat = new THREE.PointsMaterial({ color: 0xa855f7, size: 0.08, transparent: true, opacity: 0.5 });
    this.scene.add(new THREE.Points(geo, mat));
  }

  private updateServerColors(): void {
    this.servers.forEach(srv => {
      const group = this.serverMeshes.get(srv.id);
      if (!group) return;
      const color = srv.status === 'healthy' ? 0x22c55e : srv.status === 'warning' ? 0xf59e0b : 0xef4444;
      const box = group.children[0] as THREE.Mesh;
      if (box?.material) {
        const mat = box.material as THREE.MeshPhysicalMaterial;
        mat.color.setHex(color); mat.emissive.setHex(color);
        mat.emissiveIntensity = srv.status === 'critical' ? 0.4 : 0.15;
      }
    });
  }

  private animate(): void {
    this.animId = requestAnimationFrame(() => this.animate());
    const t = this.clock.getElapsedTime();

    // Rotate scene slowly
    this.scene.rotation.y = t * 0.04;

    // Pulse server rings
    this.serverMeshes.forEach((group, id) => {
      const srv = this.servers.find(s => s.id === id);
      const ring = group.children[1] as THREE.Mesh;
      if (ring?.material) {
        const mat = ring.material as THREE.MeshBasicMaterial;
        mat.opacity = 0.3 + Math.sin(t * 2 + group.position.x) * 0.2;
        if (srv?.status === 'critical') mat.opacity = 0.5 + Math.sin(t * 6) * 0.4;
      }
      // Float up/down
      group.position.y = Math.sin(t * 0.8 + group.position.x * 0.5) * 0.3;
    });

    // Camera parallax
    this.camera.position.x += (this.mouseX * 3 - this.camera.position.x) * 0.02;
    this.camera.position.y += (-this.mouseY * 2 + 8 - this.camera.position.y) * 0.02;
    this.camera.lookAt(0, 0, 0);

    this.renderer.render(this.scene, this.camera);
  }

  onResize(): void {
    const canvas = this.netCanvas?.nativeElement;
    if (!canvas) return;
    const W = canvas.clientWidth; const H = canvas.clientHeight;
    this.camera.aspect = W / H;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(W, H);
  }

  ngOnDestroy(): void {
    cancelAnimationFrame(this.animId);
    this.renderer?.dispose();
    this.subs.forEach(s => s.unsubscribe());
  }
}
