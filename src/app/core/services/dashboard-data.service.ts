import { Injectable } from '@angular/core';
import { of, delay } from 'rxjs';

export interface Appointment {
  id: string; doctor: string; specialty: string;
  date: string; time: string; avatar: string; status: 'confirmed' | 'pending';
}
export interface Prescription {
  id: string; drug: string; dosage: string; frequency: string; refills: number; issued: string;
}
export interface LabReport {
  id: string; name: string; date: string; status: 'ready' | 'pending'; fileUrl: string;
}
export interface Bill {
  id: string; description: string; amount: number; due: string; paid: boolean;
}
export interface ActivityItem {
  id: string; icon: string; message: string; time: string; type: 'info' | 'warning' | 'success';
}
export interface Doctor { id: string; name: string; specialty: string; avatar: string; }
export interface Department { id: string; name: string; icon: string; }
export interface TimeSlot {
  id: string;
  label: string;       // e.g. "09:00 AM – 09:30 AM"
  startTime: string;   // "09:00"
  available: number;   // remaining slots
  total: number;
  tokenPrefix: string; // e.g. "DM"
  tokenNumber: number; // sequential token for this slot
}

// ── Prescription History types ────────────────────────────────────────────────
export type MedForm    = 'Tablet' | 'Capsule' | 'Liquid' | 'Topical' | 'Injection';
export type MedRoute   = 'By mouth' | 'Topical' | 'Injection' | 'Inhalation';
export type BillStatus = 'paid' | 'unpaid' | 'partial';
export type LabStatus  = 'ready' | 'pending' | 'none';

export interface SigInstruction {
  morning:   boolean;
  afternoon: boolean;
  night:     boolean;
  beforeFood: boolean;
  days?: string;          // e.g. "Mon, Wed, Fri" or "Daily"
}

export interface MedicationItem {
  id: string;
  name: string;           // generic/brand
  strength: string;       // e.g. "500mg"
  form: MedForm;
  route: MedRoute;
  sig: SigInstruction;
  durationDays: number;
  notes?: string;
}

export interface VisitRecord {
  visitId:      string;
  patientId:    string;
  patientName:  string;
  patientDob:   string;
  patientAddress: string;
  doctorId:     string;
  doctorName:   string;
  doctorContact: string;
  department:   string;
  visitDate:    string;           // ISO date string
  medications:  MedicationItem[];
  labTests:     { name: string; status: LabStatus }[];
  billStatus:   BillStatus;
  nextVisitDate?: string;
  ocrVerified:  boolean;          // OCR scan verified by doctor
}

export interface VisitGroup {
  date: string;
  records: VisitRecord[];
}

@Injectable({ providedIn: 'root' })
export class DashboardDataService {

  getAppointment() {
    return of<Appointment>({
      id: 'a1', doctor: 'Dr. Sarah Chen', specialty: 'Orthodontist',
      date: 'Mon, Mar 23 2026', time: '10:30 AM', avatar: 'SC', status: 'confirmed'
    }).pipe(delay(800));
  }

  getPrescriptions() {
    return of<Prescription[]>([
      { id: 'p1', drug: 'Amoxicillin', dosage: '500mg', frequency: '3x daily', refills: 2, issued: 'Mar 10' },
      { id: 'p2', drug: 'Ibuprofen',   dosage: '400mg', frequency: 'As needed', refills: 0, issued: 'Mar 10' },
      { id: 'p3', drug: 'Chlorhexidine Mouthwash', dosage: '10ml', frequency: '2x daily', refills: 1, issued: 'Feb 28' },
    ]).pipe(delay(900));
  }

  getLabReports() {
    return of<LabReport[]>([
      { id: 'l1', name: 'Full Mouth X-Ray',    date: 'Mar 12 2026', status: 'ready',   fileUrl: '#' },
      { id: 'l2', name: 'Periodontal Screening', date: 'Mar 14 2026', status: 'ready', fileUrl: '#' },
      { id: 'l3', name: 'Blood Panel',           date: 'Mar 18 2026', status: 'pending', fileUrl: '#' },
    ]).pipe(delay(1000));
  }

  getBills() {
    return of<Bill[]>([
      { id: 'b1', description: 'Root Canal Treatment', amount: 850,  due: 'Mar 25 2026', paid: false },
      { id: 'b2', description: 'Dental Cleaning',       amount: 120,  due: 'Mar 20 2026', paid: false },
      { id: 'b3', description: 'Consultation Fee',      amount: 75,   due: 'Mar 10 2026', paid: true  },
    ]).pipe(delay(700));
  }

  getActivity() {
    return of<ActivityItem[]>([
      { id: 'n1', icon: '📋', message: 'Lab report "Full Mouth X-Ray" is ready for download.', time: '2h ago',  type: 'success' },
      { id: 'n2', icon: '⚠️', message: 'Appointment on Mar 20 may need rescheduling.', time: '5h ago',  type: 'warning' },
      { id: 'n3', icon: '💊', message: 'Prescription refill reminder: Amoxicillin.', time: '1d ago',  type: 'info'    },
      { id: 'n4', icon: '✅', message: 'Payment of $75 confirmed for Consultation Fee.', time: '2d ago',  type: 'success' },
      { id: 'n5', icon: '📅', message: 'New appointment confirmed with Dr. Sarah Chen.', time: '3d ago',  type: 'info'    },
    ]).pipe(delay(600));
  }

  getDepartments() {
    return of<Department[]>([
      { id: 'd1', name: 'General Dentistry', icon: '🦷' },
      { id: 'd2', name: 'Orthodontics',      icon: '🔧' },
      { id: 'd3', name: 'Oral Surgery',      icon: '🏥' },
      { id: 'd4', name: 'Periodontics',      icon: '🔬' },
      { id: 'd5', name: 'Endodontics',       icon: '💉' },
    ]);
  }

  getDoctors(deptId: string) {
    const map: Record<string, Doctor[]> = {
      d1: [{ id: 'dr1', name: 'Dr. James Park',   specialty: 'General Dentist',  avatar: 'JP' },
           { id: 'dr2', name: 'Dr. Aisha Patel',  specialty: 'General Dentist',  avatar: 'AP' }],
      d2: [{ id: 'dr3', name: 'Dr. Sarah Chen',   specialty: 'Orthodontist',     avatar: 'SC' },
           { id: 'dr4', name: 'Dr. Mark Rivera',  specialty: 'Orthodontist',     avatar: 'MR' }],
      d3: [{ id: 'dr5', name: 'Dr. Lisa Nguyen',  specialty: 'Oral Surgeon',     avatar: 'LN' }],
      d4: [{ id: 'dr6', name: 'Dr. Omar Hassan',  specialty: 'Periodontist',     avatar: 'OH' }],
      d5: [{ id: 'dr7', name: 'Dr. Priya Sharma', specialty: 'Endodontist',      avatar: 'PS' }],
    };
    return of(map[deptId] || []);
  }

  /** Returns available time slots for a given doctor + date.
   *  In production this would hit the backend; here we generate deterministic mock data. */
  getTimeSlots(_doctorId: string, _date: string): TimeSlot[] {
    const slots: TimeSlot[] = [];
    let tokenNum = 1;

    for (let h = 9; h < 17; h++) {
      for (const m of [0, 30]) {
        const eh = m === 30 ? h + 1 : h;
        const em = m === 30 ? 0 : 30;
        const fmt = (hh: number, mm: number) => {
          const suffix = hh >= 12 ? 'PM' : 'AM';
          const hh12   = hh > 12 ? hh - 12 : hh === 0 ? 12 : hh;
          return `${String(hh12).padStart(2, '0')}:${String(mm).padStart(2, '0')} ${suffix}`;
        };
        const seed      = (h * 60 + m) % 7;
        const total     = 4;
        const available = seed < 2 ? 0 : seed < 4 ? 1 : seed < 6 ? 2 : total;
        slots.push({
          id:          `slot-${h}-${m}`,
          label:       `${fmt(h, m)} – ${fmt(eh, em)}`,
          startTime:   `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`,
          available,
          total,
          tokenPrefix: 'DM',
          tokenNumber: tokenNum++,
        });
      }
    }
    return slots;
  }

  getVisitHistory() {
    const records: VisitRecord[] = [
      {
        visitId: 'v1', patientId: 'DM-20483',
        patientName: 'Jordan Davis', patientDob: '1990-06-15',
        patientAddress: '42 Maple Street, Austin, TX 78701',
        doctorId: 'dr3', doctorName: 'Dr. Sarah Chen',
        doctorContact: 'sarah.chen@dentamate.com | +1 512-000-0001',
        department: 'Orthodontics', visitDate: '2026-03-14',
        ocrVerified: true, billStatus: 'paid', nextVisitDate: '2026-04-14',
        labTests: [{ name: 'Panoramic X-Ray (OPG)', status: 'ready' }],
        medications: [
          {
            id: 'm1', name: 'Amoxicillin', strength: '500mg', form: 'Capsule',
            route: 'By mouth', durationDays: 7,
            sig: { morning: true, afternoon: false, night: true, beforeFood: false, days: 'Daily' }
          },
          {
            id: 'm2', name: 'Ibuprofen', strength: '400mg', form: 'Tablet',
            route: 'By mouth', durationDays: 5,
            sig: { morning: false, afternoon: true, night: true, beforeFood: false, days: 'Daily' },
            notes: 'Take only if pain persists'
          }
        ]
      },
      {
        visitId: 'v2', patientId: 'DM-20483',
        patientName: 'Jordan Davis', patientDob: '1990-06-15',
        patientAddress: '42 Maple Street, Austin, TX 78701',
        doctorId: 'dr1', doctorName: 'Dr. James Park',
        doctorContact: 'james.park@dentamate.com | +1 512-000-0002',
        department: 'General Dentistry', visitDate: '2026-02-28',
        ocrVerified: true, billStatus: 'paid', nextVisitDate: '2026-03-14',
        labTests: [
          { name: 'Periapical X-Ray (IOPA)', status: 'ready' },
          { name: 'Blood Panel', status: 'pending' }
        ],
        medications: [
          {
            id: 'm3', name: 'Chlorhexidine Mouthwash', strength: '0.2%', form: 'Liquid',
            route: 'By mouth', durationDays: 14,
            sig: { morning: true, afternoon: false, night: true, beforeFood: true, days: 'Daily' },
            notes: 'Rinse for 30 seconds, do not swallow'
          },
          {
            id: 'm4', name: 'Metronidazole', strength: '400mg', form: 'Tablet',
            route: 'By mouth', durationDays: 5,
            sig: { morning: true, afternoon: true, night: true, beforeFood: false, days: 'Daily' }
          }
        ]
      },
      {
        visitId: 'v3', patientId: 'DM-20483',
        patientName: 'Jordan Davis', patientDob: '1990-06-15',
        patientAddress: '42 Maple Street, Austin, TX 78701',
        doctorId: 'dr6', doctorName: 'Dr. Omar Hassan',
        doctorContact: 'omar.hassan@dentamate.com | +1 512-000-0003',
        department: 'Periodontics', visitDate: '2026-01-10',
        ocrVerified: false, billStatus: 'unpaid',
        labTests: [{ name: 'Periodontal Screening', status: 'ready' }],
        medications: [
          {
            id: 'm5', name: 'Doxycycline', strength: '100mg', form: 'Capsule',
            route: 'By mouth', durationDays: 10,
            sig: { morning: true, afternoon: false, night: false, beforeFood: true, days: 'Daily' }
          }
        ]
      },
      {
        visitId: 'v4', patientId: 'DM-20483',
        patientName: 'Jordan Davis', patientDob: '1990-06-15',
        patientAddress: '42 Maple Street, Austin, TX 78701',
        doctorId: 'dr3', doctorName: 'Dr. Sarah Chen',
        doctorContact: 'sarah.chen@dentamate.com | +1 512-000-0001',
        department: 'Orthodontics', visitDate: '2025-12-05',
        ocrVerified: true, billStatus: 'paid',
        labTests: [],
        medications: [
          {
            id: 'm6', name: 'Paracetamol', strength: '650mg', form: 'Tablet',
            route: 'By mouth', durationDays: 3,
            sig: { morning: true, afternoon: true, night: true, beforeFood: false, days: 'Daily' },
            notes: 'Post-procedure pain management'
          }
        ]
      }
    ];
    return of(records).pipe(delay(750));
  }
}
