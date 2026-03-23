import { Injectable } from '@angular/core';
import { BehaviorSubject, of, delay, Subject } from 'rxjs';

// ── Interfaces ────────────────────────────────────────────────────────────────

export interface QueuePatient {
  id: string;
  name: string;
  token: string;
  tokenNumber: number;
  age: number;
  gender: 'M' | 'F';
  status: 'waiting' | 'active' | 'completed' | 'skipped';
  rfidScanned: boolean;
  waitMinutes: number;
  complaint: string;
  avatar?: string;
}

export interface DailyStats {
  booked: number;
  completed: number;
  cancelled: number;
  pending: number;
}

export interface VisitRecord {
  id: string;
  date: string;
  type: string;
  doctor: string;
  notes: string;
  prescriptions: PrescriptionItem[];
  labResults: LabResult[];
  treatments: string[];
  xrays: string[];
}

export interface PrescriptionItem {
  id: string;
  name: string;
  strength: string;
  form: string;
  qty: number;
  morning: boolean;
  afternoon: boolean;
  night: boolean;
  beforeFood: boolean;
  days: string;
  notes: string;
}

export interface LabResult {
  id: string;
  name: string;
  date: string;
  status: 'ready' | 'pending';
  value?: string;
  normal?: string;
  flag?: 'high' | 'low' | 'normal';
}

export interface MedStock {
  id: string;
  name: string;
  strength: string;
  form: string;
  stock: number;
  category: string;
}

export interface Treatment {
  id: string;
  name: string;
  code: string;
  price: number;
  category: string;
}

export interface XrayType {
  id: string;
  name: string;
  code: string;
  price: number;
}

export interface ChatContact {
  id: string;
  name: string;
  role: string;
  avatar?: string;
  online: boolean;
  unread: number;
}

export interface ChatMessage {
  id: string;
  contactId: string;
  text: string;
  time: string;
  fromMe: boolean;
}

export interface PatientProfile {
  id: string;
  name: string;
  age: number;
  gender: 'M' | 'F';
  dob: string;
  phone: string;
  email: string;
  bloodGroup: string;
  allergies: string[];
  visits: VisitRecord[];
}

export interface BillItem {
  id: string;
  type: 'treatment' | 'xray' | 'medication' | 'consultation';
  name: string;
  qty: number;
  price: number;
}

// ── Service ───────────────────────────────────────────────────────────────────

@Injectable({ providedIn: 'root' })
export class DoctorDataService {

  // WebSocket simulation for RFID
  private _queuePulse = new Subject<string>();
  queuePulse$ = this._queuePulse.asObservable();

  triggerPulse(patientId: string): void { this._queuePulse.next(patientId); }

  // ── Queue ──────────────────────────────────────────────────────────────────

  getQueue() {
    return of<QueuePatient[]>([
      { id: 'q1', name: 'Aisha Rahman',    token: 'PAT-00101', tokenNumber: 1,  age: 28, gender: 'F', status: 'active',    rfidScanned: true,  waitMinutes: 0,  complaint: 'Tooth pain upper left' },
      { id: 'q2', name: 'Carlos Mendez',   token: 'PAT-00204', tokenNumber: 2,  age: 45, gender: 'M', status: 'waiting',   rfidScanned: true,  waitMinutes: 12, complaint: 'Routine checkup' },
      { id: 'q3', name: 'Priya Sharma',    token: 'PAT-00318', tokenNumber: 3,  age: 32, gender: 'F', status: 'waiting',   rfidScanned: false, waitMinutes: 25, complaint: 'Sensitivity to cold' },
      { id: 'q4', name: 'James Okafor',    token: 'PAT-00412', tokenNumber: 4,  age: 55, gender: 'M', status: 'waiting',   rfidScanned: false, waitMinutes: 38, complaint: 'Broken crown' },
      { id: 'q5', name: 'Mei Lin',         token: 'PAT-00521', tokenNumber: 5,  age: 22, gender: 'F', status: 'waiting',   rfidScanned: false, waitMinutes: 50, complaint: 'Wisdom tooth pain' },
      { id: 'q6', name: 'David Osei',      token: 'PAT-00633', tokenNumber: 6,  age: 38, gender: 'M', status: 'waiting',   rfidScanned: false, waitMinutes: 62, complaint: 'Gum bleeding' },
    ]).pipe(delay(300));
  }

  getDailyStats() {
    return of<DailyStats>({ booked: 18, completed: 7, cancelled: 2, pending: 9 }).pipe(delay(200));
  }

  // ── Patient ────────────────────────────────────────────────────────────────

  getPatient(id: string) {
    const patients: Record<string, PatientProfile> = {
      'q1': {
        id: 'q1', name: 'Aisha Rahman', age: 28, gender: 'F', dob: '1996-03-14',
        phone: '+1 512-555-0101', email: '[email protected]',
        bloodGroup: 'B+', allergies: ['Penicillin'],
        visits: [
          {
            id: 'v1', date: '2026-01-10', type: 'Consultation', doctor: 'Dr. Khalid Hassan',
            notes: 'Patient presented with mild caries on tooth #14. Advised fluoride treatment.',
            prescriptions: [
              { id: 'p1', name: 'Amoxicillin', strength: '500mg', form: 'Capsule', qty: 21,
                morning: true, afternoon: false, night: true, beforeFood: false, days: '7 days', notes: '' }
            ],
            labResults: [{ id: 'l1', name: 'Periapical X-Ray', date: '2026-01-10', status: 'ready', value: 'Mild caries', normal: 'No caries', flag: 'low' }],
            treatments: ['Fluoride Treatment'], xrays: ['Periapical']
          },
          {
            id: 'v2', date: '2025-10-22', type: 'Root Canal', doctor: 'Dr. Khalid Hassan',
            notes: 'RCT performed on tooth #36. Post-op instructions given.',
            prescriptions: [
              { id: 'p2', name: 'Ibuprofen', strength: '400mg', form: 'Tablet', qty: 15,
                morning: true, afternoon: true, night: false, beforeFood: false, days: '5 days', notes: 'After meals' }
            ],
            labResults: [],
            treatments: ['Root Canal Treatment'], xrays: ['OPG']
          }
        ]
      }
    };
    return of(patients[id] ?? null).pipe(delay(200));
  }

  // ── Medications (stock) ────────────────────────────────────────────────────

  getMedStock() {
    return of<MedStock[]>([
      { id: 'm1',  name: 'Amoxicillin',       strength: '500mg',  form: 'Capsule', stock: 120, category: 'Antibiotic' },
      { id: 'm2',  name: 'Ibuprofen',          strength: '400mg',  form: 'Tablet',  stock: 200, category: 'NSAID' },
      { id: 'm3',  name: 'Metronidazole',      strength: '400mg',  form: 'Tablet',  stock: 80,  category: 'Antibiotic' },
      { id: 'm4',  name: 'Paracetamol',        strength: '500mg',  form: 'Tablet',  stock: 300, category: 'Analgesic' },
      { id: 'm5',  name: 'Clindamycin',        strength: '300mg',  form: 'Capsule', stock: 60,  category: 'Antibiotic' },
      { id: 'm6',  name: 'Chlorhexidine',      strength: '0.2%',   form: 'Liquid',  stock: 45,  category: 'Antiseptic' },
      { id: 'm7',  name: 'Lidocaine',          strength: '2%',     form: 'Injection',stock: 30, category: 'Anesthetic' },
      { id: 'm8',  name: 'Diclofenac',         strength: '50mg',   form: 'Tablet',  stock: 150, category: 'NSAID' },
      { id: 'm9',  name: 'Dexamethasone',      strength: '4mg',    form: 'Tablet',  stock: 40,  category: 'Steroid' },
      { id: 'm10', name: 'Omeprazole',         strength: '20mg',   form: 'Capsule', stock: 90,  category: 'PPI' },
      { id: 'm11', name: 'Fluoride Gel',       strength: '1.1%',   form: 'Topical', stock: 25,  category: 'Preventive' },
      { id: 'm12', name: 'Benzocaine',         strength: '20%',    form: 'Topical', stock: 18,  category: 'Anesthetic' },
      { id: 'm13', name: 'Tetracycline',       strength: '250mg',  form: 'Capsule', stock: 0,   category: 'Antibiotic' },
      { id: 'm14', name: 'Erythromycin',       strength: '500mg',  form: 'Tablet',  stock: 5,   category: 'Antibiotic' },
    ]).pipe(delay(150));
  }

  // ── Treatments ─────────────────────────────────────────────────────────────

  getTreatments() {
    return of<Treatment[]>([
      { id: 't1',  name: 'Consultation',           code: 'CONS',  price: 50,   category: 'General' },
      { id: 't2',  name: 'Scaling & Polishing',    code: 'SCP',   price: 80,   category: 'Preventive' },
      { id: 't3',  name: 'Tooth Extraction',       code: 'EXT',   price: 120,  category: 'Surgical' },
      { id: 't4',  name: 'Root Canal Treatment',   code: 'RCT',   price: 350,  category: 'Endodontic' },
      { id: 't5',  name: 'Composite Filling',      code: 'COMP',  price: 90,   category: 'Restorative' },
      { id: 't6',  name: 'Amalgam Filling',        code: 'AMLG',  price: 70,   category: 'Restorative' },
      { id: 't7',  name: 'Crown (PFM)',            code: 'CRPFM', price: 450,  category: 'Prosthetic' },
      { id: 't8',  name: 'Crown (Zirconia)',       code: 'CRZIR', price: 650,  category: 'Prosthetic' },
      { id: 't9',  name: 'Dental Implant',         code: 'IMP',   price: 1200, category: 'Implant' },
      { id: 't10', name: 'Teeth Whitening',        code: 'WHTNG', price: 200,  category: 'Cosmetic' },
      { id: 't11', name: 'Orthodontic Braces',     code: 'BRCS',  price: 1500, category: 'Orthodontic' },
      { id: 't12', name: 'Gum Surgery',            code: 'GUMS',  price: 400,  category: 'Periodontic' },
      { id: 't13', name: 'Fluoride Treatment',     code: 'FLRD',  price: 40,   category: 'Preventive' },
      { id: 't14', name: 'Sealant Application',    code: 'SEAL',  price: 60,   category: 'Preventive' },
    ]).pipe(delay(150));
  }

  getXrayTypes() {
    return of<XrayType[]>([
      { id: 'x1', name: 'Periapical X-Ray',  code: 'PA',   price: 30  },
      { id: 'x2', name: 'Bitewing X-Ray',    code: 'BW',   price: 35  },
      { id: 'x3', name: 'OPG (Panoramic)',   code: 'OPG',  price: 80  },
      { id: 'x4', name: 'CBCT (3D Scan)',    code: 'CBCT', price: 250 },
      { id: 'x5', name: 'Cephalometric',     code: 'CEPH', price: 90  },
      { id: 'x6', name: 'Occlusal X-Ray',    code: 'OCC',  price: 40  },
    ]).pipe(delay(150));
  }

  // ── Chat ───────────────────────────────────────────────────────────────────

  getChatContacts() {
    return of<ChatContact[]>([
      { id: 'c1', name: 'Maya Thompson',  role: 'Receptionist',  online: true,  unread: 2 },
      { id: 'c2', name: 'Dr. Admin',      role: 'Clinic Admin',  online: true,  unread: 0 },
      { id: 'c3', name: 'Lab Manager',    role: 'Lab Manager',   online: false, unread: 1 },
      { id: 'c4', name: 'Pharmacy',       role: 'Pharmacist',    online: true,  unread: 0 },
    ]).pipe(delay(100));
  }

  getChatMessages(contactId: string) {
    const msgs: Record<string, ChatMessage[]> = {
      'c1': [
        { id: 'm1', contactId: 'c1', text: 'Dr. Hassan, patient PAT-00204 has arrived.', time: '09:14', fromMe: false },
        { id: 'm2', contactId: 'c1', text: 'Thanks Maya, send them in 5 mins.', time: '09:15', fromMe: true },
        { id: 'm3', contactId: 'c1', text: 'Also, PAT-00521 called to reschedule.', time: '09:18', fromMe: false },
      ],
      'c3': [
        { id: 'm4', contactId: 'c3', text: 'Lab results for Aisha Rahman are ready.', time: '08:55', fromMe: false },
        { id: 'm5', contactId: 'c3', text: 'Great, please send them to the portal.', time: '08:57', fromMe: true },
      ],
    };
    return of(msgs[contactId] ?? []).pipe(delay(100));
  }
}
