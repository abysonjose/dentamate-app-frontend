import { Injectable } from '@angular/core';
import { BehaviorSubject, of, delay } from 'rxjs';

// ── Interfaces ────────────────────────────────────────────────────────────────

export interface QueueDoctor {
  id: string;
  name: string;
  specialty: string;
  avatar: string;
  currentToken: number;
  totalWaiting: number;
  status: 'available' | 'busy' | 'break';
  room: string;
}

export interface QueuePatient {
  id: string;
  name: string;
  token: string;
  doctorId: string;
  status: 'waiting' | 'active' | 'arrived' | 'completed';
  rfidScanned: boolean;
  waitMinutes: number;
}

export interface AppointmentSummary {
  booked: number;
  completed: number;
  cancelled: number;
  total: number;
}

export interface LeaveDoctor {
  id: string;
  name: string;
  avatar: string;
  specialty: string;
  leaveFrom: string;
  leaveTo: string;
  reason: string;
}

export interface UnavailableDate {
  doctorId: string;
  date: string; // YYYY-MM-DD
}

export interface CashPayment {
  id: string;
  patientName: string;
  patientId: string;
  amount: number;
  service: string;
  time: string;
  method: 'cash' | 'card' | 'upi';
}

export interface PatientLookup {
  id: string;
  name: string;
  phone: string;
  email: string;
  dob: string;
  lastVisit: string;
  registeredOn: string;
  doctor: string;
  status: 'active' | 'inactive';
}

export interface ChatContact {
  id: string;
  name: string;
  role: 'doctor' | 'admin' | 'staff';
  avatar: string;
  online: boolean;
  lastMessage: string;
  unread: number;
}

export interface ChatMessage {
  id: string;
  contactId: string;
  text: string;
  time: string;
  fromMe: boolean;
}

export interface Notification {
  id: string;
  type: 'registration' | 'maintenance' | 'info';
  title: string;
  message: string;
  time: string;
  read: boolean;
}

// ── Service ───────────────────────────────────────────────────────────────────

@Injectable({ providedIn: 'root' })
export class ReceptionistDataService {

  // Live queue pulse subject — emits when a new check-in occurs
  private _queuePulse = new BehaviorSubject<string | null>(null);
  queuePulse$ = this._queuePulse.asObservable();

  triggerPulse(patientId: string): void {
    this._queuePulse.next(patientId);
    setTimeout(() => this._queuePulse.next(null), 2000);
  }

  getQueueDoctors() {
    return of<QueueDoctor[]>([
      { id: 'dr1', name: 'Dr. James Park',   specialty: 'General Dentist', avatar: 'JP', currentToken: 7,  totalWaiting: 4, status: 'busy',      room: 'Room 1' },
      { id: 'dr3', name: 'Dr. Sarah Chen',   specialty: 'Orthodontist',    avatar: 'SC', currentToken: 12, totalWaiting: 2, status: 'available',  room: 'Room 2' },
      { id: 'dr5', name: 'Dr. Lisa Nguyen',  specialty: 'Oral Surgeon',    avatar: 'LN', currentToken: 3,  totalWaiting: 6, status: 'busy',      room: 'Room 3' },
      { id: 'dr6', name: 'Dr. Omar Hassan',  specialty: 'Periodontist',    avatar: 'OH', currentToken: 5,  totalWaiting: 1, status: 'break',     room: 'Room 4' },
      { id: 'dr7', name: 'Dr. Priya Sharma', specialty: 'Endodontist',     avatar: 'PS', currentToken: 9,  totalWaiting: 3, status: 'available', room: 'Room 5' },
    ]).pipe(delay(400));
  }

  getQueuePatients() {
    return of<QueuePatient[]>([
      { id: 'p1', name: 'Alex Morgan',    token: 'PAT-00701', doctorId: 'dr1', status: 'active',    rfidScanned: true,  waitMinutes: 0  },
      { id: 'p2', name: 'Priya Nair',     token: 'PAT-00702', doctorId: 'dr1', status: 'arrived',   rfidScanned: true,  waitMinutes: 5  },
      { id: 'p3', name: 'Carlos Ruiz',    token: 'PAT-00703', doctorId: 'dr1', status: 'waiting',   rfidScanned: false, waitMinutes: 12 },
      { id: 'p4', name: 'Emma Wilson',    token: 'PAT-00704', doctorId: 'dr3', status: 'active',    rfidScanned: true,  waitMinutes: 0  },
      { id: 'p5', name: 'Raj Patel',      token: 'PAT-00705', doctorId: 'dr3', status: 'waiting',   rfidScanned: false, waitMinutes: 8  },
      { id: 'p6', name: 'Fatima Al-Sayed',token: 'PAT-00706', doctorId: 'dr5', status: 'active',    rfidScanned: true,  waitMinutes: 0  },
      { id: 'p7', name: 'John Kim',       token: 'PAT-00707', doctorId: 'dr5', status: 'arrived',   rfidScanned: true,  waitMinutes: 3  },
      { id: 'p8', name: 'Sara Lee',       token: 'PAT-00708', doctorId: 'dr5', status: 'waiting',   rfidScanned: false, waitMinutes: 15 },
    ]).pipe(delay(500));
  }

  getAppointmentSummary() {
    return of<AppointmentSummary>({ booked: 34, completed: 18, cancelled: 3, total: 55 }).pipe(delay(300));
  }

  getLeaveDoctors() {
    return of<LeaveDoctor[]>([
      { id: 'dr2', name: 'Dr. Aisha Patel',  avatar: 'AP', specialty: 'General Dentist', leaveFrom: '2026-03-17', leaveTo: '2026-03-19', reason: 'Medical Leave' },
      { id: 'dr4', name: 'Dr. Mark Rivera',  avatar: 'MR', specialty: 'Orthodontist',    leaveFrom: '2026-03-17', leaveTo: '2026-03-17', reason: 'Conference'    },
    ]).pipe(delay(350));
  }

  getUnavailableDates() {
    return of<UnavailableDate[]>([
      { doctorId: 'dr1', date: '2026-03-20' }, { doctorId: 'dr1', date: '2026-03-21' },
      { doctorId: 'dr1', date: '2026-03-27' }, { doctorId: 'dr1', date: '2026-03-28' },
      { doctorId: 'dr3', date: '2026-03-22' }, { doctorId: 'dr3', date: '2026-03-23' },
      { doctorId: 'dr3', date: '2026-03-29' },
      { doctorId: 'dr5', date: '2026-03-18' }, { doctorId: 'dr5', date: '2026-03-19' },
      { doctorId: 'dr6', date: '2026-03-24' }, { doctorId: 'dr6', date: '2026-03-25' },
      { doctorId: 'dr7', date: '2026-03-26' },
    ]);
  }

  getAllDoctors() {
    return of([
      { id: 'dr1', name: 'Dr. James Park',   specialty: 'General Dentist', avatar: 'JP' },
      { id: 'dr3', name: 'Dr. Sarah Chen',   specialty: 'Orthodontist',    avatar: 'SC' },
      { id: 'dr5', name: 'Dr. Lisa Nguyen',  specialty: 'Oral Surgeon',    avatar: 'LN' },
      { id: 'dr6', name: 'Dr. Omar Hassan',  specialty: 'Periodontist',    avatar: 'OH' },
      { id: 'dr7', name: 'Dr. Priya Sharma', specialty: 'Endodontist',     avatar: 'PS' },
    ]);
  }

  getCashPayments() {
    return of<CashPayment[]>([
      { id: 'c1', patientName: 'Alex Morgan',    patientId: 'PAT-00701', amount: 350, service: 'Root Canal',       time: '09:15 AM', method: 'cash' },
      { id: 'c2', patientName: 'Emma Wilson',    patientId: 'PAT-00704', amount: 120, service: 'Dental Cleaning',  time: '10:00 AM', method: 'card' },
      { id: 'c3', patientName: 'Carlos Ruiz',    patientId: 'PAT-00703', amount: 75,  service: 'Consultation',     time: '10:45 AM', method: 'upi'  },
      { id: 'c4', patientName: 'Fatima Al-Sayed',patientId: 'PAT-00706', amount: 500, service: 'Oral Surgery',     time: '11:30 AM', method: 'cash' },
    ]).pipe(delay(400));
  }

  searchPatients(query: string) {
    const all: PatientLookup[] = [
      { id: 'PAT-00701', name: 'Alex Morgan',     phone: '+1 512-000-1001', email: 'alex@example.com',   dob: '1988-04-12', lastVisit: '2026-03-10', registeredOn: '2024-01-15', doctor: 'Dr. James Park',   status: 'active'   },
      { id: 'PAT-00704', name: 'Emma Wilson',     phone: '+1 512-000-1002', email: 'emma@example.com',   dob: '1995-07-22', lastVisit: '2026-03-14', registeredOn: '2024-03-20', doctor: 'Dr. Sarah Chen',   status: 'active'   },
      { id: 'PAT-00709', name: 'Jordan Davis',    phone: '+1 512-000-1003', email: 'jordan@example.com', dob: '1990-06-15', lastVisit: '2026-03-14', registeredOn: '2023-11-05', doctor: 'Dr. Sarah Chen',   status: 'active'   },
      { id: 'PAT-00703', name: 'Carlos Ruiz',     phone: '+1 512-000-1004', email: 'carlos@example.com', dob: '1982-09-30', lastVisit: '2026-02-28', registeredOn: '2024-06-10', doctor: 'Dr. Lisa Nguyen',  status: 'active'   },
      { id: 'PAT-00706', name: 'Fatima Al-Sayed', phone: '+1 512-000-1005', email: 'fatima@example.com', dob: '1993-12-01', lastVisit: '2026-01-20', registeredOn: '2025-01-08', doctor: 'Dr. Omar Hassan',  status: 'inactive' },
    ];
    const q = query.toLowerCase();
    return of(all.filter(p =>
      p.name.toLowerCase().includes(q) ||
      p.id.toLowerCase().includes(q) ||
      p.phone.includes(q)
    )).pipe(delay(300));
  }

  getChatContacts() {
    return of<ChatContact[]>([
      { id: 'dr1', name: 'Dr. James Park',   role: 'doctor', avatar: 'JP', online: true,  lastMessage: 'Please send the next patient.',  unread: 1 },
      { id: 'dr3', name: 'Dr. Sarah Chen',   role: 'doctor', avatar: 'SC', online: true,  lastMessage: 'Running 5 mins late.',            unread: 0 },
      { id: 'adm', name: 'Clinic Admin',     role: 'admin',  avatar: 'CA', online: true,  lastMessage: 'System update tonight at 11 PM.', unread: 2 },
      { id: 'st1', name: 'Nurse Priya',      role: 'staff',  avatar: 'NP', online: false, lastMessage: 'Room 3 is ready.',                unread: 0 },
      { id: 'dr5', name: 'Dr. Lisa Nguyen',  role: 'doctor', avatar: 'LN', online: false, lastMessage: 'Cancel my 2 PM slot.',            unread: 0 },
    ]);
  }

  getChatMessages(contactId: string) {
    const map: Record<string, ChatMessage[]> = {
      dr1: [
        { id: 'm1', contactId: 'dr1', text: 'Good morning! Ready for the day?',          time: '08:55 AM', fromMe: true  },
        { id: 'm2', contactId: 'dr1', text: 'Yes, please send the next patient.',         time: '09:00 AM', fromMe: false },
        { id: 'm3', contactId: 'dr1', text: 'Token PAT-00701 is on the way.',                time: '09:01 AM', fromMe: true  },
        { id: 'm4', contactId: 'dr1', text: 'Please send the next patient.',              time: '09:45 AM', fromMe: false },
      ],
      dr3: [
        { id: 'm1', contactId: 'dr3', text: 'Dr. Chen, your 10 AM is here.',             time: '09:58 AM', fromMe: true  },
        { id: 'm2', contactId: 'dr3', text: 'Running 5 mins late.',                       time: '10:00 AM', fromMe: false },
      ],
      adm: [
        { id: 'm1', contactId: 'adm', text: 'Hi, any updates on the new billing module?', time: '08:30 AM', fromMe: true  },
        { id: 'm2', contactId: 'adm', text: 'System update tonight at 11 PM.',            time: '08:35 AM', fromMe: false },
        { id: 'm3', contactId: 'adm', text: 'Please inform all staff.',                   time: '08:36 AM', fromMe: false },
      ],
      st1: [
        { id: 'm1', contactId: 'st1', text: 'Is Room 3 ready for the next patient?',     time: '09:20 AM', fromMe: true  },
        { id: 'm2', contactId: 'st1', text: 'Room 3 is ready.',                           time: '09:22 AM', fromMe: false },
      ],
      dr5: [
        { id: 'm1', contactId: 'dr5', text: 'Dr. Nguyen, your 2 PM is confirmed.',       time: '11:00 AM', fromMe: true  },
        { id: 'm2', contactId: 'dr5', text: 'Cancel my 2 PM slot.',                       time: '11:05 AM', fromMe: false },
      ],
    };
    return of(map[contactId] ?? []);
  }

  getNotifications() {
    return of<Notification[]>([
      { id: 'n1', type: 'registration', title: 'New Self-Registration',    message: 'Patient "Lena Müller" has self-registered via the portal.',       time: '5 min ago',  read: false },
      { id: 'n2', type: 'registration', title: 'New Self-Registration',    message: 'Patient "Arjun Mehta" has self-registered via the portal.',        time: '22 min ago', read: false },
      { id: 'n3', type: 'maintenance',  title: 'System Maintenance',       message: 'Scheduled maintenance tonight at 11:00 PM. Save all work.',        time: '1 hr ago',   read: false },
      { id: 'n4', type: 'info',         title: 'Appointment Rescheduled',  message: 'Token PAT-00703 rescheduled to 3:00 PM by Dr. James Park.',           time: '2 hr ago',   read: true  },
      { id: 'n5', type: 'maintenance',  title: 'Backup Complete',          message: 'Daily data backup completed successfully.',                         time: '3 hr ago',   read: true  },
    ]).pipe(delay(300));
  }
}
