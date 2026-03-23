import { Injectable, NgZone, OnDestroy } from '@angular/core';
import * as THREE from 'three';

@Injectable({ providedIn: 'root' })
export class ThreeService implements OnDestroy {
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private animationId!: number;

  // 3D objects
  private molarGroup!: THREE.Group;
  private particles!: THREE.Points;
  private helixGroup!: THREE.Group;

  // Mouse parallax state
  private mouseX = 0;
  private mouseY = 0;
  private targetX = 0;
  private targetY = 0;

  // Breathing animation clock
  private clock = new THREE.Clock();

  constructor(private ngZone: NgZone) {}

  /** Initialize Three.js into the given canvas element */
  init(canvas: HTMLCanvasElement): void {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;

    // ── Scene ──────────────────────────────────────────────────────────────
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x020c18, 0.035);

    // ── Camera ─────────────────────────────────────────────────────────────
    this.camera = new THREE.PerspectiveCamera(60, w / h, 0.1, 200);
    this.camera.position.set(0, 0, 12);

    // ── Renderer ───────────────────────────────────────────────────────────
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    this.renderer.setSize(w, h);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;

    // ── Lighting ───────────────────────────────────────────────────────────
    const ambient = new THREE.AmbientLight(0x0d9488, 0.4);
    this.scene.add(ambient);

    const tealPoint = new THREE.PointLight(0x14b8a6, 80, 40);
    tealPoint.position.set(-6, 4, 6);
    this.scene.add(tealPoint);

    const bluePoint = new THREE.PointLight(0x3b82f6, 60, 40);
    bluePoint.position.set(6, -4, 4);
    this.scene.add(bluePoint);

    const rimLight = new THREE.PointLight(0xffffff, 20, 30);
    rimLight.position.set(0, 8, -4);
    this.scene.add(rimLight);

    // ── Build scene objects ────────────────────────────────────────────────
    this.buildMolar();
    this.buildHelix();
    this.buildParticles();

    // ── Start loop outside Angular zone ───────────────────────────────────
    this.ngZone.runOutsideAngular(() => this.animate());
  }

  // ── Molar geometry (procedural) ─────

  private buildMolar(): void {
    this.molarGroup = new THREE.Group();

    const mat = new THREE.MeshPhysicalMaterial({
      color: 0xd4f1f4,
      metalness: 0.1,
      roughness: 0.25,
      transmission: 0.4,
      thickness: 1.2,
      transparent: true,
      opacity: 0.92,
      envMapIntensity: 1.5
    });

    // Crown — main body (slightly flattened sphere)
    const crownGeo = new THREE.SphereGeometry(1.6, 64, 64);
    crownGeo.scale(1, 0.75, 1);
    const crown = new THREE.Mesh(crownGeo, mat);
    crown.position.y = 0.4;
    this.molarGroup.add(crown);

    // Cusps — 4 bumps on top
    const cuspPositions = [
      [-0.7, 1.1, -0.7], [0.7, 1.1, -0.7],
      [-0.7, 1.1,  0.7], [0.7, 1.1,  0.7]
    ];
    cuspPositions.forEach(([x, y, z]) => {
      const cusp = new THREE.Mesh(
        new THREE.SphereGeometry(0.42, 32, 32),
        mat
      );
      cusp.position.set(x, y, z);
      this.molarGroup.add(cusp);
    });

    // Roots — 3 tapered cylinders
    const rootMat = mat.clone();
    rootMat.color.set(0xb8dde0);
    const rootDefs = [
      { x: -0.55, z: 0 }, { x: 0.55, z: 0 }, { x: 0, z: 0.5 }
    ];
    rootDefs.forEach(({ x, z }) => {
      const rootGeo = new THREE.CylinderGeometry(0.22, 0.06, 1.8, 24);
      const root = new THREE.Mesh(rootGeo, rootMat);
      root.position.set(x, -1.3, z);
      this.molarGroup.add(root);
    });

    // Wireframe overlay for tech feel
    const wireMat = new THREE.MeshBasicMaterial({
      color: 0x14b8a6,
      wireframe: true,
      transparent: true,
      opacity: 0.08
    });
    const wireGeo = new THREE.SphereGeometry(1.65, 16, 16);
    wireGeo.scale(1, 0.75, 1);
    this.molarGroup.add(new THREE.Mesh(wireGeo, wireMat));

    this.molarGroup.position.set(-1, 0, 0);
    this.scene.add(this.molarGroup);
  }

  // ── DNA-like helix of dental crosses ────────────────────────────────────
  private buildHelix(): void {
    this.helixGroup = new THREE.Group();

    const crossMat = new THREE.MeshPhysicalMaterial({
      color: 0x0d9488,
      emissive: 0x0d9488,
      emissiveIntensity: 0.3,
      metalness: 0.6,
      roughness: 0.2,
      transparent: true,
      opacity: 0.75
    });

    const steps = 24;
    const helixRadius = 3.2;
    const helixHeight = 10;

    for (let i = 0; i < steps; i++) {
      const t = i / steps;
      const angle = t * Math.PI * 4; // two full turns
      const y = (t - 0.5) * helixHeight;

      // Strand A
      const posA = new THREE.Vector3(
        Math.cos(angle) * helixRadius,
        y,
        Math.sin(angle) * helixRadius - 4
      );

      // Strand B (offset by π)
      const posB = new THREE.Vector3(
        Math.cos(angle + Math.PI) * helixRadius,
        y,
        Math.sin(angle + Math.PI) * helixRadius - 4
      );

      [posA, posB].forEach(pos => {
        const size = 0.12 + Math.random() * 0.08;
        const sphere = new THREE.Mesh(
          new THREE.SphereGeometry(size, 12, 12),
          crossMat
        );
        sphere.position.copy(pos);
        this.helixGroup.add(sphere);
      });

      // Connector bar between strands
      if (i % 3 === 0) {
        const dir = posB.clone().sub(posA);
        const len = dir.length();
        const mid = posA.clone().add(posB).multiplyScalar(0.5);

        const barGeo = new THREE.CylinderGeometry(0.03, 0.03, len, 8);
        const bar = new THREE.Mesh(barGeo, crossMat);
        bar.position.copy(mid);
        bar.quaternion.setFromUnitVectors(
          new THREE.Vector3(0, 1, 0),
          dir.normalize()
        );
        this.helixGroup.add(bar);
      }
    }

    this.scene.add(this.helixGroup);
  }

  // ── Floating particle field ──────────────────────────────────────────────
  private buildParticles(): void {
    const count = 320;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);

    const teal = new THREE.Color(0x14b8a6);
    const blue = new THREE.Color(0x3b82f6);

    for (let i = 0; i < count; i++) {
      positions[i * 3]     = (Math.random() - 0.5) * 30;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 20;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 20 - 5;

      const c = Math.random() > 0.5 ? teal : blue;
      colors[i * 3]     = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    this.particles = new THREE.Points(geo, new THREE.PointsMaterial({
      size: 0.06,
      vertexColors: true,
      transparent: true,
      opacity: 0.7,
      sizeAttenuation: true
    }));

    this.scene.add(this.particles);
  }

  // ── Animation loop ───────────────────────────────────────────────────────
  private animate(): void {
    this.animationId = requestAnimationFrame(() => this.animate());

    const elapsed = this.clock.getElapsedTime();

    // Smooth mouse follow (lerp)
    this.targetX += (this.mouseX - this.targetX) * 0.04;
    this.targetY += (this.mouseY - this.targetY) * 0.04;

    // Molar: slow rotation + breathing scale + parallax tilt
    if (this.molarGroup) {
      this.molarGroup.rotation.y = elapsed * 0.25;
      this.molarGroup.rotation.x = this.targetY * 0.3;
      const breathe = 1 + Math.sin(elapsed * 0.8) * 0.04;
      this.molarGroup.scale.setScalar(breathe);
    }

    // Helix: counter-rotation for depth
    if (this.helixGroup) {
      this.helixGroup.rotation.y = -elapsed * 0.12;
      this.helixGroup.rotation.x = this.targetY * 0.15;
      this.helixGroup.rotation.z = this.targetX * 0.1;
    }

    // Particles: slow drift
    if (this.particles) {
      this.particles.rotation.y = elapsed * 0.015;
      this.particles.rotation.x = elapsed * 0.008;
    }

    // Camera parallax
    this.camera.position.x += (this.targetX * 1.5 - this.camera.position.x) * 0.03;
    this.camera.position.y += (-this.targetY * 1.0 - this.camera.position.y) * 0.03;
    this.camera.lookAt(this.scene.position);

    this.renderer.render(this.scene, this.camera);
  }

  /** Update mouse position for parallax (call from component) */
  onMouseMove(x: number, y: number): void {
    this.mouseX = (x / window.innerWidth - 0.5) * 2;
    this.mouseY = (y / window.innerHeight - 0.5) * 2;
  }

  /** Handle canvas resize */
  onResize(width: number, height: number): void {
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  ngOnDestroy(): void {
    cancelAnimationFrame(this.animationId);
    this.renderer?.dispose();
  }
}
