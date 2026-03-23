import {
  Component, OnDestroy, ElementRef, ViewChild, AfterViewInit, NgZone
} from '@angular/core';
import { trigger, transition, style, animate } from '@angular/animations';
import * as THREE from 'three';
import { ArSmileService, AnalysisResponse, GapCoords } from '../../../../core/services/ar-smile.service';

type Mode       = 'live' | 'photo';
type ToothShape = 'oval' | 'square' | 'tapered';

interface Particle { x: number; y: number; delay: string; dur: string; }

@Component({
  selector: 'app-doc-ar-smile',
  templateUrl: './doc-ar-smile.component.html',
  styleUrls:  ['./doc-ar-smile.component.scss'],
  animations: [
    trigger('fadeIn', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(8px)' }),
        animate('300ms ease', style({ opacity: 1, transform: 'translateY(0)' })),
      ]),
    ]),
  ],
})
export class DocArSmileComponent implements AfterViewInit, OnDestroy {

  // ── UI state ──────────────────────────────────────────────────────────────
  mode: Mode         = 'photo';
  toothShape: ToothShape = 'oval';
  shadeValue         = 85;          // 0–100 brightness slider
  analyzing          = false;
  cameraActive       = false;
  cameraError        = '';
  result: AnalysisResponse | null = null;
  uploadedSrc: string | null = null;
  private uploadedFile: File | null = null;

  particles: Particle[] = Array.from({ length: 20 }, () => ({
    x:     Math.random() * 100,
    y:     Math.random() * 100,
    delay: `-${(Math.random() * 6).toFixed(1)}s`,
    dur:   `${(4 + Math.random() * 4).toFixed(1)}s`,
  }));

  // ── DOM refs ──────────────────────────────────────────────────────────────
  @ViewChild('videoEl')   videoEl!:   ElementRef<HTMLVideoElement>;
  @ViewChild('canvasEl')  canvasEl!:  ElementRef<HTMLCanvasElement>;
  @ViewChild('threeEl')   threeEl!:   ElementRef<HTMLDivElement>;
  @ViewChild('photoImg')  photoImg!:  ElementRef<HTMLImageElement>;

  // ── Three.js ──────────────────────────────────────────────────────────────
  private renderer!: THREE.WebGLRenderer;
  private scene!:    THREE.Scene;
  private camera!:   THREE.PerspectiveCamera;
  private toothMesh: THREE.Mesh | null = null;
  private rafId     = 0;

  // ── MediaPipe / camera ────────────────────────────────────────────────────
  private stream:    MediaStream | null = null;
  private faceMesh:  any = null;
  private liveRafId = 0;

  constructor(
    private arService: ArSmileService,
    private zone: NgZone,
  ) {}

  ngAfterViewInit(): void {
    this.initThree();
  }

  // ── Mode toggle ───────────────────────────────────────────────────────────
  setMode(m: Mode): void {
    this.mode = m;
    if (m === 'live') {
      this.startCamera();
    } else {
      this.stopCamera();
    }
  }

  // ── Photo upload ──────────────────────────────────────────────────────────
  onFileChange(e: Event): void {
    const input = e.target as HTMLInputElement;
    if (!input.files?.length) return;
    this.uploadedFile = input.files[0];
    const reader = new FileReader();
    reader.onload = ev => {
      this.uploadedSrc = ev.target?.result as string;
      this.result = null;
    };
    reader.readAsDataURL(this.uploadedFile);
  }

  analyzePhoto(): void {
    if (!this.uploadedFile) return;
    this.analyzing = true;
    this.arService.analyzePhoto(this.uploadedFile).subscribe({
      next: res => {
        this.result = res;
        this.analyzing = false;
        if (res.gap_coordinates) {
          this.toothShape = res.recommended_shape;
          this.renderTooth(res.gap_coordinates, res.tooth_color);
        }
      },
      error: () => { this.analyzing = false; },
    });
  }

  // ── Shape / shade controls ────────────────────────────────────────────────
  setShape(s: ToothShape): void {
    this.toothShape = s;
    if (this.toothMesh) this.applyShape(this.toothMesh, s);
  }

  onShadeChange(): void {
    if (!this.toothMesh) return;
    const mat = this.toothMesh.material as THREE.MeshStandardMaterial;
    const v   = this.shadeValue / 100;
    mat.color.setRGB(v, v * 0.97, v * 0.93);
    mat.needsUpdate = true;
  }

  get shadeHex(): string {
    const v = Math.round(this.shadeValue * 2.55);
    const g = Math.round(v * 0.97);
    const b = Math.round(v * 0.93);
    return `rgb(${v},${g},${b})`;
  }

  // ── Three.js setup ────────────────────────────────────────────────────────
  private initThree(): void {
    const el = this.threeEl?.nativeElement;
    if (!el) return;

    this.scene  = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(45, el.clientWidth / el.clientHeight, 0.1, 100);
    this.camera.position.set(0, 0, 4);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(el.clientWidth || 320, el.clientHeight || 240);
    this.renderer.shadowMap.enabled = true;
    el.appendChild(this.renderer.domElement);

    // Lighting
    const ambient = new THREE.AmbientLight(0xffffff, 0.6);
    const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
    dirLight.position.set(2, 4, 3);
    dirLight.castShadow = true;
    this.scene.add(ambient, dirLight);

    // Subtle fill light
    const fill = new THREE.PointLight(0x14b8a6, 0.4, 10);
    fill.position.set(-3, 2, 2);
    this.scene.add(fill);

    this.animate();
  }

  renderTooth(gap: GapCoords, colorHex: string): void {
    if (this.toothMesh) {
      this.scene.remove(this.toothMesh);
      this.toothMesh.geometry.dispose();
    }

    const geo = this.buildToothGeometry(this.toothShape);
    const mat = new THREE.MeshStandardMaterial({
      color:       new THREE.Color(colorHex),
      roughness:   0.25,
      metalness:   0.05,
      transparent: true,
      opacity:     0.92,
    });

    this.toothMesh = new THREE.Mesh(geo, mat);
    this.toothMesh.castShadow = true;

    // Scale to match gap proportions (normalised)
    const scaleX = (gap.width  / 100) * 1.5;
    const scaleY = (gap.height / 100) * 1.5;
    this.toothMesh.scale.set(scaleX, scaleY, 0.6);

    this.scene.add(this.toothMesh);
  }

  private buildToothGeometry(shape: ToothShape): THREE.BufferGeometry {
    const geo = new THREE.BoxGeometry(1, 1.4, 0.5, 4, 6, 2);
    const pos = geo.attributes['position'] as THREE.BufferAttribute;

    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const z = pos.getZ(i);

      let nx = x, ny = y, nz = z;

      if (shape === 'oval') {
        // Cosine-based rounding on top corners
        const t  = (y + 0.7) / 1.4;
        const cx = Math.cos((Math.abs(x) / 0.5) * (Math.PI / 2));
        nx = x * (0.6 + 0.4 * cx);
        ny = y + (t > 0.7 ? (t - 0.7) * 0.3 : 0);
      } else if (shape === 'tapered') {
        // Narrow at top
        const t = (y + 0.7) / 1.4;
        nx = x * (1 - t * 0.45);
      }
      // square: no modification

      pos.setXYZ(i, nx, ny, nz);
    }

    geo.computeVertexNormals();
    return geo;
  }

  private applyShape(mesh: THREE.Mesh, shape: ToothShape): void {
    const newGeo = this.buildToothGeometry(shape);
    mesh.geometry.dispose();
    mesh.geometry = newGeo;
  }

  private animate(): void {
    this.rafId = requestAnimationFrame(() => this.animate());
    if (this.toothMesh) {
      this.toothMesh.rotation.y += 0.004;
    }
    this.renderer?.render(this.scene, this.camera);
  }

  // ── Live camera ───────────────────────────────────────────────────────────
  async startCamera(): Promise<void> {
    this.cameraError = '';
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: 640, height: 480 } });
      this.cameraActive = true;
      setTimeout(() => {
        if (this.videoEl?.nativeElement) {
          this.videoEl.nativeElement.srcObject = this.stream;
          this.videoEl.nativeElement.play();
          this.initMediaPipe();
        }
      }, 100);
    } catch {
      this.cameraError = 'Camera access denied. Please allow camera permissions.';
    }
  }

  stopCamera(): void {
    this.stream?.getTracks().forEach(t => t.stop());
    this.stream = null;
    this.cameraActive = false;
    cancelAnimationFrame(this.liveRafId);
  }

  private async initMediaPipe(): Promise<void> {
    try {
      // Load MediaPipe from CDN via script tags — no npm package required
      await this.loadScript('https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js');
      await this.loadScript('https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/face_mesh.js');

      const win = window as any;
      const FaceMesh = win.FaceMesh;
      const Camera   = win.Camera;

      if (!FaceMesh || !Camera) {
        console.warn('MediaPipe not available from CDN.');
        return;
      }

      this.faceMesh = new FaceMesh({
        locateFile: (f: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${f}`,
      });
      this.faceMesh.setOptions({ maxNumFaces: 1, refineLandmarks: true, minDetectionConfidence: 0.5, minTrackingConfidence: 0.5 });
      this.faceMesh.onResults((results: any) => this.onFaceResults(results));

      const cam = new Camera(this.videoEl.nativeElement, {
        onFrame: async () => { await this.faceMesh.send({ image: this.videoEl.nativeElement }); },
        width: 640, height: 480,
      });
      cam.start();
    } catch {
      console.warn('MediaPipe failed to load, showing raw camera feed.');
    }
  }

  private loadScript(src: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (document.querySelector(`script[src="${src}"]`)) { resolve(); return; }
      const s = document.createElement('script');
      s.src = src; s.crossOrigin = 'anonymous';
      s.onload  = () => resolve();
      s.onerror = () => reject(new Error(`Failed to load ${src}`));
      document.head.appendChild(s);
    });
  }

  private smoothX = 0;
  private smoothY = 0;

  private onFaceResults(results: any): void {
    if (!results.multiFaceLandmarks?.length) return;
    const lm = results.multiFaceLandmarks[0];

    // Landmark 13 = upper lip centre
    const lip = lm[13];
    const canvas = this.canvasEl?.nativeElement;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width  = this.videoEl.nativeElement.videoWidth;
    canvas.height = this.videoEl.nativeElement.videoHeight;

    // Draw video frame
    ctx.drawImage(this.videoEl.nativeElement, 0, 0);

    // Smooth landmark position (lerp)
    const targetX = lip.x * canvas.width;
    const targetY = lip.y * canvas.height;
    this.smoothX += (targetX - this.smoothX) * 0.25;
    this.smoothY += (targetY - this.smoothY) * 0.25;

    // Draw tooth overlay at lip landmark
    this.drawToothOverlay(ctx, this.smoothX, this.smoothY - 18);
  }

  private drawToothOverlay(ctx: CanvasRenderingContext2D, cx: number, cy: number): void {
    const w = 60, h = 28;
    const color = this.shadeHex;

    ctx.save();
    ctx.globalAlpha = 0.82;
    ctx.fillStyle   = color;
    ctx.strokeStyle = 'rgba(255,255,255,0.4)';
    ctx.lineWidth   = 1;

    if (this.toothShape === 'oval') {
      ctx.beginPath();
      ctx.ellipse(cx, cy, w / 2, h / 2, 0, 0, Math.PI * 2);
      ctx.fill(); ctx.stroke();
    } else if (this.toothShape === 'square') {
      ctx.beginPath();
      ctx.roundRect(cx - w / 2, cy - h / 2, w, h, 4);
      ctx.fill(); ctx.stroke();
    } else {
      // tapered
      ctx.beginPath();
      ctx.moveTo(cx - w / 2, cy + h / 2);
      ctx.lineTo(cx + w / 2, cy + h / 2);
      ctx.lineTo(cx + w / 4, cy - h / 2);
      ctx.lineTo(cx - w / 4, cy - h / 2);
      ctx.closePath();
      ctx.fill(); ctx.stroke();
    }

    // Highlight glint
    ctx.globalAlpha = 0.25;
    ctx.fillStyle   = 'white';
    ctx.beginPath();
    ctx.ellipse(cx - 8, cy - 6, 10, 5, -0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // ── Cleanup ───────────────────────────────────────────────────────────────
  ngOnDestroy(): void {
    cancelAnimationFrame(this.rafId);
    this.stopCamera();
    this.renderer?.dispose();
  }
}
