import { Component, OnInit, OnDestroy, ElementRef, ViewChild, NgZone } from '@angular/core';
import * as THREE from 'three';
import { ReceptionistDataService, QueueDoctor } from '../../../../core/services/receptionist-data.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-rec-clinic3d',
  templateUrl: './clinic3d.component.html',
  styleUrls: ['./clinic3d.component.scss']
})
export class Clinic3dComponent implements OnInit, OnDestroy {
  @ViewChild('canvas3d', { static: true }) canvasRef!: ElementRef<HTMLCanvasElement>;

  doctors: QueueDoctor[] = [];
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private animId!: number;
  private clock = new THREE.Clock();
  private rooms: { mesh: THREE.Mesh; label: string; status: string; pulse: number }[] = [];
  private tokenParticles: THREE.Points[] = [];
  private subs: Subscription[] = [];
  isPulsing = false;

  constructor(private data: ReceptionistDataService, private ngZone: NgZone) {}

  ngOnInit(): void {
    this.data.getQueueDoctors().subscribe(d => {
      this.doctors = d;
      this.initScene();
    });
    this.subs.push(this.data.queuePulse$.subscribe(id => {
      if (id) { this.isPulsing = true; this.triggerTokenFlow(); setTimeout(() => this.isPulsing = false, 2000); }
    }));
  }

  private initScene(): void {
    const canvas = this.canvasRef.nativeElement;
    const w = canvas.clientWidth || 800;
    const h = canvas.clientHeight || 480;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x070f1a);
    this.scene.fog = new THREE.FogExp2(0x070f1a, 0.025);

    this.camera = new THREE.PerspectiveCamera(55, w / h, 0.1, 200);
    this.camera.position.set(0, 14, 18);
    this.camera.lookAt(0, 0, 0);

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setSize(w, h);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;

    // Lighting
    this.scene.add(new THREE.AmbientLight(0x0d9488, 0.5));
    const sun = new THREE.DirectionalLight(0xffffff, 1.2);
    sun.position.set(5, 12, 8); sun.castShadow = true;
    this.scene.add(sun);
    const fill = new THREE.PointLight(0x3b82f6, 40, 30);
    fill.position.set(-8, 6, 0); this.scene.add(fill);

    this.buildFloorPlan();
    this.buildGrid();

    this.ngZone.runOutsideAngular(() => this.animate());
  }

  private buildFloorPlan(): void {
    // Floor
    const floorGeo = new THREE.PlaneGeometry(28, 20);
    const floorMat = new THREE.MeshStandardMaterial({ color: 0x0d1b2e, roughness: 0.9 });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true;
    this.scene.add(floor);

    // Reception desk (center-front)
    const deskGeo = new THREE.BoxGeometry(5, 0.6, 1.5);
    const deskMat = new THREE.MeshStandardMaterial({ color: 0x14b8a6, roughness: 0.4, metalness: 0.3 });
    const desk = new THREE.Mesh(deskGeo, deskMat);
    desk.position.set(0, 0.3, 7); desk.castShadow = true;
    this.scene.add(desk);

    // Label glow above desk
    const glowGeo = new THREE.PlaneGeometry(4, 0.5);
    const glowMat = new THREE.MeshBasicMaterial({ color: 0x14b8a6, transparent: true, opacity: 0.3, side: THREE.DoubleSide });
    const glow = new THREE.Mesh(glowGeo, glowMat);
    glow.position.set(0, 1.2, 7); glow.rotation.x = -0.2;
    this.scene.add(glow);

    // Doctor rooms
    const roomPositions = [
      { x: -10, z: -4 }, { x: -5, z: -4 }, { x: 0, z: -4 },
      { x:   5, z: -4 }, { x: 10, z: -4 }
    ];

    const statusColors: Record<string, number> = { available: 0x4ade80, busy: 0xf59e0b, break: 0xf87171 };

    roomPositions.forEach((pos, i) => {
      const doc = this.doctors[i];
      const color = doc ? statusColors[doc.status] ?? 0x94a3b8 : 0x1e293b;

      // Room box
      const roomGeo = new THREE.BoxGeometry(4, 2.5, 4);
      const roomMat = new THREE.MeshStandardMaterial({
        color: 0x0d1b2e, roughness: 0.7,
        emissive: color, emissiveIntensity: 0.08
      });
      const room = new THREE.Mesh(roomGeo, roomMat);
      room.position.set(pos.x, 1.25, pos.z); room.castShadow = true;
      this.scene.add(room);

      // Status light on top
      const lightGeo = new THREE.SphereGeometry(0.25, 16, 16);
      const lightMat = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 1.5 });
      const light = new THREE.Mesh(lightGeo, lightMat);
      light.position.set(pos.x, 2.8, pos.z);
      this.scene.add(light);

      // Point light for room glow
      const roomLight = new THREE.PointLight(color, 8, 6);
      roomLight.position.set(pos.x, 3, pos.z);
      this.scene.add(roomLight);

      this.rooms.push({ mesh: room, label: doc?.name ?? `Room ${i+1}`, status: doc?.status ?? 'available', pulse: 0 });
    });

    // Corridor lines
    const corridorMat = new THREE.LineBasicMaterial({ color: 0x14b8a6, transparent: true, opacity: 0.3 });
    const corridorPts = [new THREE.Vector3(-13, 0.05, 2), new THREE.Vector3(13, 0.05, 2)];
    const corridorGeo = new THREE.BufferGeometry().setFromPoints(corridorPts);
    this.scene.add(new THREE.Line(corridorGeo, corridorMat));
  }

  private buildGrid(): void {
    const gridHelper = new THREE.GridHelper(28, 28, 0x14b8a6, 0x0d2a3a);
    (gridHelper.material as THREE.Material).transparent = true;
    (gridHelper.material as THREE.Material).opacity = 0.25;
    this.scene.add(gridHelper);
  }

  triggerTokenFlow(): void {
    // Spawn token flow particles from desk to a random room
    const count = 40;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const t = i / count;
      positions[i * 3]     = (Math.random() - 0.5) * 2;
      positions[i * 3 + 1] = 0.5 + Math.random() * 1.5;
      positions[i * 3 + 2] = 7 - t * 12;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({ color: 0x14b8a6, size: 0.18, transparent: true, opacity: 0.9 });
    const pts = new THREE.Points(geo, mat);
    this.scene.add(pts);
    this.tokenParticles.push(pts);
    setTimeout(() => {
      this.scene.remove(pts);
      this.tokenParticles = this.tokenParticles.filter(p => p !== pts);
    }, 2000);
  }

  private animate(): void {
    this.animId = requestAnimationFrame(() => this.animate());
    const t = this.clock.getElapsedTime();

    // Gentle camera orbit
    this.camera.position.x = Math.sin(t * 0.08) * 3;
    this.camera.lookAt(0, 0, 0);

    // Pulse room lights
    this.rooms.forEach((r, i) => {
      const pulse = 0.06 + Math.sin(t * 1.5 + i) * 0.04;
      (r.mesh.material as THREE.MeshStandardMaterial).emissiveIntensity = pulse;
    });

    // Animate token particles
    this.tokenParticles.forEach(pts => {
      pts.position.z -= 0.08;
      (pts.material as THREE.PointsMaterial).opacity -= 0.008;
    });

    this.renderer.render(this.scene, this.camera);
  }

  ngOnDestroy(): void {
    cancelAnimationFrame(this.animId);
    this.renderer?.dispose();
    this.subs.forEach(s => s.unsubscribe());
  }
}
