import { Component, OnInit, OnDestroy, ElementRef, ViewChild, NgZone } from '@angular/core';
import * as THREE from 'three';
import { PharmacistDataService, PharmacyInventoryItem } from '../../../../core/services/pharmacist-data.service';
import { ThemeService, Theme } from '../../../../core/services/theme.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-pharm-shelf3d',
  templateUrl: './pharm-shelf3d.component.html',
  styleUrls: ['./pharm-shelf3d.component.scss']
})
export class PharmShelf3dComponent implements OnInit, OnDestroy {
  @ViewChild('shelfCanvas', { static: true }) canvasRef!: ElementRef<HTMLCanvasElement>;

  inventory: PharmacyInventoryItem[] = [];
  theme: Theme = 'dark';
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private animId!: number;
  private bottles: { mesh: THREE.Mesh; item: PharmacyInventoryItem }[] = [];
  private clock = new THREE.Clock();
  private subs: Subscription[] = [];

  constructor(
    private pharmData: PharmacistDataService,
    private themeService: ThemeService,
    private ngZone: NgZone
  ) {}

  ngOnInit(): void {
    this.subs.push(this.themeService.theme$.subscribe(t => { this.theme = t; this.updateBg(); }));
    this.pharmData.getInventory().subscribe(inv => {
      this.inventory = inv;
      this.initScene();
      this.buildShelf();
      this.ngZone.runOutsideAngular(() => this.animate());
    });
  }

  ngOnDestroy(): void {
    cancelAnimationFrame(this.animId);
    this.renderer?.dispose();
    this.subs.forEach(s => s.unsubscribe());
  }

  private initScene(): void {
    const canvas = this.canvasRef.nativeElement;
    const w = canvas.clientWidth || 800;
    const h = canvas.clientHeight || 420;

    this.scene = new THREE.Scene();
    this.updateBg();

    this.camera = new THREE.PerspectiveCamera(55, w / h, 0.1, 100);
    this.camera.position.set(0, 2, 12);
    this.camera.lookAt(0, 0, 0);

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    this.renderer.setSize(w, h);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;

    const ambient = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambient);
    const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
    dirLight.position.set(5, 10, 5);
    dirLight.castShadow = true;
    this.scene.add(dirLight);
    const fillLight = new THREE.PointLight(0x14b8a6, 0.8, 30);
    fillLight.position.set(-6, 4, 4);
    this.scene.add(fillLight);
  }

  private buildShelf(): void {
    const shelfMat = new THREE.MeshPhysicalMaterial({ color: 0x4a3728, roughness: 0.8, metalness: 0.1 });
    const shelfGeo = new THREE.BoxGeometry(14, 0.15, 1.5);

    // 3 shelf levels
    [-1.5, 0.5, 2.5].forEach((y, si) => {
      const shelf = new THREE.Mesh(shelfGeo, shelfMat);
      shelf.position.set(0, y, 0);
      shelf.receiveShadow = true;
      this.scene.add(shelf);

      // Side supports
      const supportGeo = new THREE.BoxGeometry(0.12, 4.5, 1.5);
      [-7, 7].forEach(x => {
        const s = new THREE.Mesh(supportGeo, shelfMat);
        s.position.set(x, 0.5, 0);
        this.scene.add(s);
      });

      // Place bottles on this shelf
      const itemsOnShelf = this.inventory.slice(si * 5, si * 5 + 5);
      itemsOnShelf.forEach((item, idx) => {
        const bottle = this.createBottle(item);
        bottle.position.set(-4.5 + idx * 2.2, y + 0.6, 0);
        this.scene.add(bottle);
        this.bottles.push({ mesh: bottle, item });
      });
    });
  }

  private createBottle(item: PharmacyInventoryItem): THREE.Mesh {
    const level = this.stockLevel(item);
    const color = level === 'ok' ? 0x10b981 : level === 'low' ? 0xf59e0b : 0xef4444;
    const geo = new THREE.CylinderGeometry(0.3, 0.35, 1.1, 16);
    const mat = new THREE.MeshPhysicalMaterial({
      color, roughness: 0.3, metalness: 0.1,
      transmission: 0.3, thickness: 0.5, transparent: true, opacity: 0.85
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.castShadow = true;

    // Cap
    const capGeo = new THREE.CylinderGeometry(0.28, 0.28, 0.18, 16);
    const capMat = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.4 });
    const cap = new THREE.Mesh(capGeo, capMat);
    cap.position.y = 0.64;
    mesh.add(cap);

    return mesh;
  }

  private stockLevel(item: PharmacyInventoryItem): 'ok' | 'low' | 'critical' {
    if (item.stock === 0) return 'critical';
    if (item.stock <= item.minStock) return 'low';
    return 'ok';
  }

  private updateBg(): void {
    if (!this.scene) return;
    this.scene.background = new THREE.Color(this.theme === 'dark' ? 0x0a1628 : 0xf0f4f8);
  }

  private animate(): void {
    this.animId = requestAnimationFrame(() => this.animate());
    const t = this.clock.getElapsedTime();
    // Gentle bob animation for bottles
    this.bottles.forEach((b, i) => {
      b.mesh.position.y += Math.sin(t * 1.2 + i * 0.8) * 0.0008;
      b.mesh.rotation.y = Math.sin(t * 0.4 + i * 0.5) * 0.15;
    });
    this.renderer.render(this.scene, this.camera);
  }
}
