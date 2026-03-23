import { Component } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { trigger, transition, style, animate } from '@angular/animations';

interface DetectionResult {
  label: string;
  confidence: number;
  bbox: [number, number, number, number]; // x, y, w, h (%)
  color: string;
}

interface PredictResponse {
  diagnosis: string;
  confidence: number;
}

interface LesionAdvice {
  treatment: string[];
  medicines: string[];
  dos: string[];
  donts: string[];
}

const LESION_ADVICE: Record<string, LesionAdvice> = {
  'Primary Endodontic Lesion': {
    treatment: [
      'Root Canal Treatment (RCT) — infected nerve removal, canal cleaning and sealing.',
      'If prior RCT exists: retreatment or apical surgery (apicoectomy).',
      'Surrounding bone typically heals once the root is cleaned.',
    ],
    medicines: [
      'Pain: NSAIDs (Ibuprofen) or Acetaminophen.',
      'Infection (if spreading — facial swelling, fever, lymph nodes): Amoxicillin or Clindamycin.',
    ],
    dos: [
      'Eat soft foods on the opposite side until RCT is complete.',
      'Use warm saltwater rinses to soothe the gums.',
    ],
    donts: [
      'Do not apply heat to the outside of your face — it can draw pus into facial tissues.',
      'Do not chew hard or sticky foods on the affected tooth before the final crown is placed.',
    ],
  },
  'Primary Periodontal Lesion': {
    treatment: [
      'Scaling and Root Planing (SRP) — deep cleaning to remove plaque and tartar.',
      'Advanced bone loss: periodontal flap surgery or bone grafting may be required.',
    ],
    medicines: [
      'Topical: Chlorhexidine 0.12% antimicrobial mouthwash.',
      'Localized: Antibiotic microspheres (e.g., Arestin) placed into gum pockets.',
      'Systemic: Oral antibiotics for aggressive periodontitis cases.',
    ],
    dos: [
      'Brush twice daily and floss consistently.',
      'Switch to an extra-soft bristled toothbrush to prevent further gum recession.',
    ],
    donts: [
      'Do not smoke or use tobacco — it constricts blood vessels and severely delays healing.',
      'Do not skip follow-up periodontal maintenance cleanings.',
    ],
  },
  'Primary Endodontic with Secondary Periodontal': {
    treatment: [
      'Root Canal Treatment (RCT) FIRST — removing the source stops bone destruction.',
      'Secondary gum pocket often heals on its own after RCT.',
      'If pocket persists after healing: Periodontal Therapy (SRP) is performed.',
    ],
    medicines: [
      'NSAIDs for pain management.',
      'Antibiotics may be required depending on the size of the abscess.',
    ],
    dos: [
      'Get the root canal completed as soon as possible to stop bone destruction.',
    ],
    donts: [
      'Do not treat only the gums — without RCT, periodontal treatment will completely fail.',
    ],
  },
  'Primary Periodontal with Secondary Endodontic': {
    treatment: [
      'Requires BOTH Root Canal Treatment and Periodontal Therapy.',
      'Long-term tooth survival depends on remaining bone support after gum treatment.',
    ],
    medicines: [
      'Chlorhexidine mouth rinses.',
      'Pain relievers (NSAIDs or Acetaminophen).',
      'Localized or systemic antibiotics as indicated.',
    ],
    dos: [
      'Prepare for a longer, multi-step treatment plan.',
      'Strictly follow all home-care hygiene instructions from the periodontist.',
    ],
    donts: [
      'Do not ignore tooth mobility — the tooth has lost significant bone support.',
      'Avoid chewing hard foods on the affected tooth to prevent fracture.',
    ],
  },
  'True Combined Lesion': {
    treatment: [
      'Requires complex Root Canal Treatment AND advanced Periodontal Surgery.',
      'Prognosis is often guarded to poor.',
      'If bone loss is too extensive: Extraction followed by dental implant or bridge is recommended.',
    ],
    medicines: [
      'Broad-spectrum antibiotics to manage the heavy bacterial load.',
      'Stronger analgesics may be required post-surgery or post-extraction.',
    ],
    dos: [
      'Have a candid discussion with your dentist about the realistic success rate.',
      'Consider extraction + implant as a more predictable long-term option.',
    ],
    donts: [
      'Do not delay a decision — the lesion can spread bacteria and cause bone loss in adjacent healthy teeth.',
    ],
  },
};

@Component({
  selector: 'app-doc-ai-panel',
  templateUrl: './doc-ai-panel.component.html',
  styleUrls: ['./doc-ai-panel.component.scss'],
  animations: [
    trigger('fadeSlide', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(10px)' }),
        animate('300ms ease', style({ opacity: 1, transform: 'translateY(0)' }))
      ])
    ])
  ]
})
export class DocAiPanelComponent {
  private readonly API = 'http://localhost:8000';

  constructor(private http: HttpClient) {}

  uploadedImage: string | null = null;
  fileName = '';
  analyzing = false;
  results: DetectionResult[] = [];
  aiSummary = '';
  advice: LesionAdvice | null = null;
  showBboxes = true;
  validationError = '';
  validating = false;
  private uploadedFile: File | null = null;

  // Accepted MIME types — standard images only (no video, no PDF, no HEIC etc.)
  private readonly ACCEPTED_MIME = ['image/jpeg', 'image/jpg', 'image/png', 'image/bmp', 'image/tiff', 'image/webp'];
  private readonly DENTAL_KEYWORDS = [
    'xray', 'x-ray', 'xr', 'opg', 'cbct', 'ceph', 'periapical', 'bitewing',
    'panoramic', 'dental', 'tooth', 'teeth', 'intraoral', 'scan', 'dicom',
    'radiograph', 'molar', 'mandible', 'maxilla', 'occlusal', 'pa_', '_pa',
  ];

  mockResults: DetectionResult[] = [
    { label: 'Caries (Occlusal)',  confidence: 0.94, bbox: [28, 22, 18, 14], color: '#f87171' },
    { label: 'Periapical Lesion',  confidence: 0.87, bbox: [55, 45, 14, 12], color: '#fbbf24' },
    { label: 'Bone Loss (Mild)',   confidence: 0.76, bbox: [15, 60, 22, 10], color: '#a855f7' },
    { label: 'Healthy Enamel',     confidence: 0.98, bbox: [70, 20, 16, 12], color: '#4ade80' },
  ];

  onFileChange(e: Event): void {
    const input = e.target as HTMLInputElement;
    if (!input.files?.length) return;
    const file = input.files[0];

    // Reset state
    this.validationError = '';
    this.uploadedImage = null;
    this.results = [];
    this.aiSummary = '';

    // 1. MIME type check
    if (!this.ACCEPTED_MIME.includes(file.type)) {
      this.validationError = `File type "${file.type || 'unknown'}" is not supported. Please upload a PNG, JPG, BMP, TIFF, or WebP image.`;
      input.value = '';
      return;
    }

    // 2. File size guard (max 20 MB)
    if (file.size > 20 * 1024 * 1024) {
      this.validationError = 'File is too large. Maximum allowed size is 20 MB.';
      input.value = '';
      return;
    }

    this.fileName = file.name;
    this.validating = true;
    this.uploadedFile = file;

    const reader = new FileReader();
    reader.onload = ev => {
      const dataUrl = ev.target?.result as string;
      // 3. Pixel-level validation via canvas
      this.validateImageContent(dataUrl, file.name).then(valid => {
        this.validating = false;
        if (valid) {
          this.uploadedImage = dataUrl;
        } else {
          this.uploadedImage = null;
          this.fileName = '';
          input.value = '';
        }
      });
    };
    reader.readAsDataURL(file);
  }

  /**
   * Validates image content using two heuristics:
   * 1. Filename keyword match (fast path — dental keywords in name → accept)
   * 2. Grayscale ratio analysis — X-rays and intraoral photos are predominantly
   *    grayscale/low-saturation. If >60% of sampled pixels are near-grayscale
   *    (R≈G≈B within ±25), the image is accepted. Colorful photos (selfies,
   *    landscapes, etc.) fail this check.
   */
  private validateImageContent(dataUrl: string, fileName: string): Promise<boolean> {
    return new Promise(resolve => {
      // Fast path: filename contains a dental keyword
      const nameLower = fileName.toLowerCase().replace(/[_\-\s]/g, '');
      const hasDentalKeyword = this.DENTAL_KEYWORDS.some(kw => nameLower.includes(kw.replace(/[_\-\s]/g, '')));
      if (hasDentalKeyword) { resolve(true); return; }

      // Pixel analysis via offscreen canvas
      const img = new Image();
      img.onload = () => {
        const SAMPLE = 64; // sample grid size
        const canvas = document.createElement('canvas');
        canvas.width = SAMPLE; canvas.height = SAMPLE;
        const ctx = canvas.getContext('2d');
        if (!ctx) { resolve(true); return; } // can't validate, allow through

        ctx.drawImage(img, 0, 0, SAMPLE, SAMPLE);
        const { data } = ctx.getImageData(0, 0, SAMPLE, SAMPLE);
        const total = SAMPLE * SAMPLE;
        let grayscaleCount = 0;
        let darkCount = 0; // very dark pixels typical of X-ray background

        for (let i = 0; i < data.length; i += 4) {
          const r = data[i], g = data[i + 1], b = data[i + 2];
          const maxDiff = Math.max(Math.abs(r - g), Math.abs(g - b), Math.abs(r - b));
          if (maxDiff <= 25) grayscaleCount++; // near-grayscale pixel
          const brightness = (r + g + b) / 3;
          if (brightness < 30) darkCount++; // near-black (X-ray background)
        }

        const grayscaleRatio = grayscaleCount / total;
        const darkRatio = darkCount / total;

        // Accept if:
        // - >60% grayscale pixels (X-ray, intraoral photo, CBCT slice), OR
        // - >40% very dark pixels AND >50% grayscale (classic X-ray with black bg)
        const isValid = grayscaleRatio > 0.60 || (darkRatio > 0.40 && grayscaleRatio > 0.50);

        if (!isValid) {
          this.validationError = 'This image does not appear to be a dental X-ray or intraoral photo. Please upload a valid dental radiograph or clinical image.';
        }
        resolve(isValid);
      };
      img.onerror = () => { this.validationError = 'Could not read the image file. Please try again.'; resolve(false); };
      img.src = dataUrl;
    });
  }

  analyze(): void {
    if (!this.uploadedImage || !this.uploadedFile) return;
    this.analyzing = true;
    this.results = [];
    this.aiSummary = '';
    this.advice = null;

    const form = new FormData();
    form.append('file', this.uploadedFile);

    this.http.post<PredictResponse>(`${this.API}/predict`, form).subscribe({
      next: (res) => {
        const confidence = res.confidence / 100;
        this.results = [{
          label: res.diagnosis,
          confidence,
          bbox: [20, 20, 60, 60],
          color: this.confidenceColor(confidence),
        }];
        this.aiSummary = `AI Classifier Result\n\nDiagnosis: ${res.diagnosis}\nConfidence: ${res.confidence.toFixed(1)}%`;
        this.advice = LESION_ADVICE[res.diagnosis] ?? null;
        this.analyzing = false;
      },
      error: (err) => {
        this.validationError = err?.error?.detail ?? 'Server error. Make sure the backend is running.';
        this.analyzing = false;
      },
    });
  }

  get sortedResults(): DetectionResult[] {
    return [...this.results].sort((a, b) => b.confidence - a.confidence);
  }

  confidenceColor(c: number): string {
    if (c >= 0.9) return '#4ade80';
    if (c >= 0.75) return '#fbbf24';
    return '#f87171';
  }
}
