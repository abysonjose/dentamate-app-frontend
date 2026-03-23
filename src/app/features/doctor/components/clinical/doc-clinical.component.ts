import { Component, OnInit } from '@angular/core';
import { trigger, transition, style, animate } from '@angular/animations';
import { DoctorDataService, PatientProfile, MedStock, Treatment, XrayType, PrescriptionItem, BillItem } from '../../../../core/services/doctor-data.service';

@Component({
  selector: 'app-doc-clinical',
  templateUrl: './doc-clinical.component.html',
  styleUrls: ['./doc-clinical.component.scss'],
  animations: [
    trigger('fadeSlide', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(10px)' }),
        animate('300ms ease', style({ opacity: 1, transform: 'translateY(0)' }))
      ]),
      transition(':leave', [
        animate('200ms ease', style({ opacity: 0, transform: 'translateY(-6px)' }))
      ])
    ]),
    trigger('tabSwitch', [
      transition('* => *', [
        style({ opacity: 0, transform: 'translateX(8px)' }),
        animate('250ms ease', style({ opacity: 1, transform: 'translateX(0)' }))
      ])
    ])
  ]
})
export class DocClinicalComponent implements OnInit {
  // Patient selection
  patientId = 'q1';
  patient: PatientProfile | null = null;
  loadingPatient = true;

  // Tabs: timeline | prescription | billing
  activeTab: 'timeline' | 'prescription' | 'billing' = 'timeline';

  // Prescription
  medStock: MedStock[] = [];
  medSearch = '';
  medDropdownOpen = false;
  filteredMeds: MedStock[] = [];
  rxItems: PrescriptionItem[] = [];
  nextApptDate = '';
  rxSaved = false;
  ocrModalOpen = false;
  ocrFile: File | null = null;
  ocrResult = '';
  ocrLoading = false;

  // Billing
  treatments: Treatment[] = [];
  xrayTypes: XrayType[] = [];
  billItems: BillItem[] = [];
  treatSearch = '';
  xraySearch = '';

  constructor(private data: DoctorDataService) {}

  ngOnInit(): void {
    this.data.getPatient(this.patientId).subscribe(p => { this.patient = p; this.loadingPatient = false; });
    this.data.getMedStock().subscribe(m => this.medStock = m);
    this.data.getTreatments().subscribe(t => this.treatments = t);
    this.data.getXrayTypes().subscribe(x => this.xrayTypes = x);
  }

  // ── Medication Search ──────────────────────────────────────────────────────

  onMedSearch(): void {
    const q = this.medSearch.toLowerCase();
    this.filteredMeds = q.length < 1 ? [] :
      this.medStock.filter(m => m.name.toLowerCase().includes(q) || m.category.toLowerCase().includes(q));
    this.medDropdownOpen = this.filteredMeds.length > 0;
  }

  selectMed(med: MedStock): void {
    if (med.stock === 0) return;
    const exists = this.rxItems.find(r => r.id === med.id);
    if (!exists) {
      this.rxItems.push({
        id: med.id, name: med.name, strength: med.strength, form: med.form,
        qty: 10, morning: true, afternoon: false, night: true,
        beforeFood: false, days: '5 days', notes: ''
      });
    }
    this.medSearch = '';
    this.medDropdownOpen = false;
    this.filteredMeds = [];
  }

  removeRxItem(id: string): void { this.rxItems = this.rxItems.filter(r => r.id !== id); }

  saveRx(): void { this.rxSaved = true; setTimeout(() => this.rxSaved = false, 3000); }

  // ── OCR ────────────────────────────────────────────────────────────────────

  openOcr(): void { this.ocrModalOpen = true; this.ocrResult = ''; this.ocrFile = null; }
  closeOcr(): void { this.ocrModalOpen = false; }

  onOcrFile(e: Event): void {
    const input = e.target as HTMLInputElement;
    if (input.files?.length) this.ocrFile = input.files[0];
  }

  runOcr(): void {
    if (!this.ocrFile) return;
    this.ocrLoading = true;
    this.ocrResult = '';

    const reader = new FileReader();
    reader.onload = async (e) => {
      const dataUrl = e.target?.result as string;
      // Extract base64 content (strip the data:image/...;base64, prefix)
      const base64 = dataUrl.split(',')[1];
      const mimeType = this.ocrFile!.type || 'image/jpeg';

      try {
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': 'Bearer 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',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: 'meta-llama/llama-4-scout-17b-16e-instruct',
            messages: [
              {
                role: 'user',
                content: [
                  {
                    type: 'image_url',
                    image_url: { url: `data:${mimeType};base64,${base64}` }
                  },
                  {
                    type: 'text',
                    text: `You are a medical OCR assistant. Extract all prescription information from this image and format it clearly as:

Patient: [name if visible]
Date: [date if visible]

Rx:
[list each medication with dosage, frequency, and duration]

Instructions: [any special instructions]
Next Visit: [if mentioned]

If any field is not visible, omit it. Be precise and structured.`
                  }
                ]
              }
            ],
            max_tokens: 1024,
            temperature: 0.1
          })
        });

        if (!response.ok) {
          const err = await response.json();
          this.ocrResult = `Error: ${err?.error?.message ?? 'Groq API request failed'}`;
        } else {
          const data = await response.json();
          this.ocrResult = data.choices?.[0]?.message?.content ?? 'No text extracted.';
        }
      } catch (err: any) {
        this.ocrResult = `Network error: ${err?.message ?? 'Could not reach Groq API'}`;
      } finally {
        this.ocrLoading = false;
      }
    };
    reader.readAsDataURL(this.ocrFile);
  }

  // ── Billing ────────────────────────────────────────────────────────────────

  addTreatment(t: Treatment): void {
    if (this.billItems.find(b => b.id === t.id)) return;
    this.billItems.push({ id: t.id, type: 'treatment', name: `${t.name} (${t.code})`, qty: 1, price: t.price });
  }

  addXray(x: XrayType): void {
    if (this.billItems.find(b => b.id === x.id)) return;
    this.billItems.push({ id: x.id, type: 'xray', name: `${x.name} (${x.code})`, qty: 1, price: x.price });
  }

  removeBillItem(id: string): void { this.billItems = this.billItems.filter(b => b.id !== id); }

  get billTotal(): number { return this.billItems.reduce((s, b) => s + b.qty * b.price, 0); }

  get filteredTreatments(): Treatment[] {
    const q = this.treatSearch.toLowerCase();
    return q ? this.treatments.filter(t => t.name.toLowerCase().includes(q) || t.category.toLowerCase().includes(q)) : this.treatments;
  }

  get filteredXrays(): XrayType[] {
    const q = this.xraySearch.toLowerCase();
    return q ? this.xrayTypes.filter(x => x.name.toLowerCase().includes(q)) : this.xrayTypes;
  }

  get today(): string {
    return new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  }
}
