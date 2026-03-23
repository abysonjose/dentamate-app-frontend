import { Injectable } from '@angular/core';
import { BehaviorSubject, of, delay, Subject } from 'rxjs';

// ── Interfaces ────────────────────────────────────────────────────────────────

export type TestStatus = 'pending' | 'billed' | 'paid' | 'uploaded' | 'completed';
export type PaymentStatus = 'unpaid' | 'paid';

export interface LabTest {
  id: string;
  name: string;
  code: string;
  price: number;
  prescribedBy: string;
  prescribedDate: string;
  status: TestStatus;
  paymentStatus: PaymentStatus;
  uploadedFile?: string;
  uploadedFileName?: string;
  uploadedAt?: string;
}

export interface LabPatient {
  id: string;
  name: string;
  dob: string;
  phone: string;
  email: string;
  doctor: string;
  doctorId: string;
  branch: string;
  tests: LabTest[];
}

export interface LabReportHistory {
  reportId: string;
  patientId: string;
  patientName: string;
  testName: string;
  testCode: string;
  date: string;
  uploadedAt: string;
  fileUrl: string;
  fileName: string;
  doctor: string;
  status: 'completed';
}

export interface LabChatContact {
  id: string;
  name: string;
  role: 'doctor' | 'admin';
  avatar: string;
  branch: string;
  online: boolean;
  lastMessage: string;
  unread: number;
}

export interface LabChatMessage {
  id: string;
  contactId: string;
  text: string;
  time: string;
  fromMe: boolean;
}

export interface MaintenanceNotification {
  id: string;
  type: 'maintenance' | 'update' | 'alert';
  title: string;
  message: string;
  time: string;
  read: boolean;
  severity: 'info' | 'warning' | 'critical';
}

export interface Notification {
  id: string;
  type: 'maintenance' | 'update' | 'alert';
  title: string;
  message: string;
  time: string;
  read: boolean;
  severity: 'info' | 'warning' | 'critical';
}

// ── Service ───────────────────────────────────────────────────────────────────

@Injectable({ providedIn: 'root' })
export class LabDataService {

  private _uploadProgress = new BehaviorSubject<{ testId: string; progress: number } | null>(null);
  uploadProgress$ = this._uploadProgress.asObservable();

  private _notification = new Subject<{ type: 'patient' | 'doctor'; name: string; testName: string }>();
  notification$ = this._notification.asObservable();

  // Simulate sending notification
  sendCompletionNotification(patientName: string, doctorName: string, testName: string): void {
    this._notification.next({ type: 'patient', name: patientName, testName });
    setTimeout(() => this._notification.next({ type: 'doctor', name: doctorName, testName }), 500);
  }

  simulateUpload(testId: string): Promise<void> {
    return new Promise(resolve => {
      let progress = 0;
      const interval = setInterval(() => {
        progress += Math.random() * 20 + 5;
        if (progress >= 100) {
          progress = 100;
          this._uploadProgress.next({ testId, progress: 100 });
          clearInterval(interval);
          setTimeout(() => { this._uploadProgress.next(null); resolve(); }, 400);
        } else {
          this._uploadProgress.next({ testId, progress: Math.round(progress) });
        }
      }, 200);
    });
  }

  lookupPatient(userId: string) {
    const patients: Record<string, LabPatient> = {
      'PAT-00701': {
        id: 'PAT-00701', name: 'Alex Morgan', dob: '1988-04-12',
        phone: '+1 512-000-1001', email: '[email protected]',
        doctor: 'Dr. James Park', doctorId: 'dr1', branch: 'Main Branch',
        tests: [
          { id: 't1', name: 'Bitewing X-Ray',   code: 'BW',   price: 35,  prescribedBy: 'Dr. James Park', prescribedDate: '2026-03-15', status: 'paid',    paymentStatus: 'paid',   uploadedFile: undefined },
          { id: 't2', name: 'OPG (Panoramic)',   code: 'OPG',  price: 80,  prescribedBy: 'Dr. James Park', prescribedDate: '2026-03-15', status: 'pending', paymentStatus: 'unpaid', uploadedFile: undefined },
          { id: 't3', name: 'CBCT (3D Scan)',    code: 'CBCT', price: 250, prescribedBy: 'Dr. James Park', prescribedDate: '2026-03-15', status: 'pending', paymentStatus: 'unpaid', uploadedFile: undefined },
        ]
      },
      'PAT-00704': {
        id: 'PAT-00704', name: 'Emma Wilson', dob: '1995-07-22',
        phone: '+1 512-000-1002', email: '[email protected]',
        doctor: 'Dr. Sarah Chen', doctorId: 'dr3', branch: 'North Branch',
        tests: [
          { id: 't4', name: 'Periapical X-Ray', code: 'PA',   price: 30,  prescribedBy: 'Dr. Sarah Chen', prescribedDate: '2026-03-14', status: 'uploaded', paymentStatus: 'paid', uploadedFile: 'data:image/png;base64,iVBORw0KGgo=', uploadedFileName: 'periapical_emma.jpg', uploadedAt: '2026-03-14 11:30 AM' },
          { id: 't5', name: 'Cephalometric',    code: 'CEPH', price: 90,  prescribedBy: 'Dr. Sarah Chen', prescribedDate: '2026-03-14', status: 'billed',   paymentStatus: 'unpaid', uploadedFile: undefined },
        ]
      },
      'PAT-00709': {
        id: 'PAT-00709', name: 'Jordan Davis', dob: '1990-06-15',
        phone: '+1 512-000-1003', email: '[email protected]',
        doctor: 'Dr. Sarah Chen', doctorId: 'dr3', branch: 'Main Branch',
        tests: [
          { id: 't6', name: 'OPG (Panoramic)',   code: 'OPG',  price: 80,  prescribedBy: 'Dr. Sarah Chen', prescribedDate: '2026-03-14', status: 'completed', paymentStatus: 'paid', uploadedFile: 'data:image/png;base64,iVBORw0KGgo=', uploadedFileName: 'opg_jordan.jpg', uploadedAt: '2026-03-14 02:15 PM' },
          { id: 't7', name: 'Periapical X-Ray', code: 'PA',   price: 30,  prescribedBy: 'Dr. Sarah Chen', prescribedDate: '2026-03-14', status: 'paid',      paymentStatus: 'paid', uploadedFile: undefined },
        ]
      },
      'PAT-00703': {
        id: 'PAT-00703', name: 'Carlos Ruiz', dob: '1982-09-30',
        phone: '+1 512-000-1004', email: '[email protected]',
        doctor: 'Dr. Lisa Nguyen', doctorId: 'dr5', branch: 'South Branch',
        tests: [
          { id: 't8', name: 'CBCT (3D Scan)',    code: 'CBCT', price: 250, prescribedBy: 'Dr. Lisa Nguyen', prescribedDate: '2026-03-12', status: 'pending', paymentStatus: 'unpaid', uploadedFile: undefined },
          { id: 't9', name: 'Occlusal X-Ray',   code: 'OCC',  price: 40,  prescribedBy: 'Dr. Lisa Nguyen', prescribedDate: '2026-03-12', status: 'pending', paymentStatus: 'unpaid', uploadedFile: undefined },
        ]
      },
    };
    return of(patients[userId.toUpperCase()] ?? null).pipe(delay(600));
  }

  getReportHistory(userId: string) {
    const allHistory: LabReportHistory[] = [
      { reportId: 'r1', patientId: 'PAT-00709', patientName: 'Jordan Davis',  testName: 'OPG (Panoramic)',   testCode: 'OPG',  date: '2026-03-14', uploadedAt: '2026-03-14 02:15 PM', fileUrl: '#', fileName: 'opg_jordan.jpg',       doctor: 'Dr. Sarah Chen',   status: 'completed' },
      { reportId: 'r2', patientId: 'PAT-00709', patientName: 'Jordan Davis',  testName: 'Periapical X-Ray', testCode: 'PA',   date: '2026-02-28', uploadedAt: '2026-02-28 10:45 AM', fileUrl: '#', fileName: 'pa_jordan_feb.jpg',    doctor: 'Dr. James Park',   status: 'completed' },
      { reportId: 'r3', patientId: 'PAT-00709', patientName: 'Jordan Davis',  testName: 'Bitewing X-Ray',   testCode: 'BW',   date: '2026-01-10', uploadedAt: '2026-01-10 03:00 PM', fileUrl: '#', fileName: 'bw_jordan_jan.jpg',    doctor: 'Dr. Omar Hassan',  status: 'completed' },
      { reportId: 'r4', patientId: 'PAT-00701', patientName: 'Alex Morgan',   testName: 'Bitewing X-Ray',   testCode: 'BW',   date: '2026-03-10', uploadedAt: '2026-03-10 09:30 AM', fileUrl: '#', fileName: 'bw_alex.jpg',          doctor: 'Dr. James Park',   status: 'completed' },
      { reportId: 'r5', patientId: 'PAT-00704', patientName: 'Emma Wilson',   testName: 'Periapical X-Ray', testCode: 'PA',   date: '2026-03-14', uploadedAt: '2026-03-14 11:30 AM', fileUrl: '#', fileName: 'periapical_emma.jpg',  doctor: 'Dr. Sarah Chen',   status: 'completed' },
    ];
    return of(allHistory.filter(r => r.patientId === userId.toUpperCase())).pipe(delay(500));
  }

  getChatContacts() {
    return of<LabChatContact[]>([
      { id: 'dr1', name: 'Dr. James Park',   role: 'doctor', avatar: 'JP', branch: 'Main Branch',  online: true,  lastMessage: 'Please prioritize the CBCT for DM-20481.', unread: 2 },
      { id: 'dr3', name: 'Dr. Sarah Chen',   role: 'doctor', avatar: 'SC', branch: 'North Branch', online: true,  lastMessage: 'OPG results look good, thanks.',           unread: 0 },
      { id: 'dr5', name: 'Dr. Lisa Nguyen',  role: 'doctor', avatar: 'LN', branch: 'South Branch', online: false, lastMessage: 'When will CBCT for Carlos be ready?',      unread: 1 },
      { id: 'adm', name: 'Clinic Admin',     role: 'admin',  avatar: 'CA', branch: 'All Branches', online: true,  lastMessage: 'New equipment arrives Monday.',            unread: 0 },
      { id: 'adm2',name: 'Branch Manager',   role: 'admin',  avatar: 'BM', branch: 'Main Branch',  online: false, lastMessage: 'Monthly report due Friday.',               unread: 0 },
    ]);
  }

  getChatMessages(contactId: string) {
    const map: Record<string, LabChatMessage[]> = {
      dr1: [
        { id: 'm1', contactId: 'dr1', text: 'Good morning! Lab is ready for the day.',                    time: '08:30 AM', fromMe: true  },
        { id: 'm2', contactId: 'dr1', text: 'Please prioritize the CBCT for PAT-00701.',                   time: '08:45 AM', fromMe: false },
        { id: 'm3', contactId: 'dr1', text: 'Noted, will process it first.',                              time: '08:46 AM', fromMe: true  },
        { id: 'm4', contactId: 'dr1', text: 'Also the bitewing is billed, patient needs to pay.',         time: '09:00 AM', fromMe: false },
      ],
      dr3: [
        { id: 'm1', contactId: 'dr3', text: 'OPG for Jordan Davis is uploaded.',                          time: '02:16 PM', fromMe: true  },
        { id: 'm2', contactId: 'dr3', text: 'OPG results look good, thanks.',                             time: '02:20 PM', fromMe: false },
      ],
      dr5: [
        { id: 'm1', contactId: 'dr5', text: 'CBCT for Carlos Ruiz is pending payment.',                   time: '10:00 AM', fromMe: true  },
        { id: 'm2', contactId: 'dr5', text: 'When will CBCT for Carlos be ready?',                        time: '11:30 AM', fromMe: false },
        { id: 'm3', contactId: 'dr5', text: 'Once payment is confirmed, we will process immediately.',    time: '11:32 AM', fromMe: true  },
      ],
      adm: [
        { id: 'm1', contactId: 'adm', text: 'Hi, how many tests processed today?',                        time: '09:00 AM', fromMe: true  },
        { id: 'm2', contactId: 'adm', text: 'New equipment arrives Monday.',                              time: '09:05 AM', fromMe: false },
      ],
      adm2: [
        { id: 'm1', contactId: 'adm2', text: 'Monthly report due Friday.',                                time: '08:00 AM', fromMe: false },
        { id: 'm2', contactId: 'adm2', text: 'Will have it ready by Thursday.',                           time: '08:10 AM', fromMe: true  },
      ],
    };
    return of(map[contactId] ?? []);
  }

  getMaintenanceNotifications() {
    return of<MaintenanceNotification[]>([
      { id: 'mn1', type: 'maintenance', title: 'Scheduled Maintenance',    message: 'System maintenance tonight at 11:00 PM. Please save all work and log out.',          time: '1 hr ago',   read: false, severity: 'warning'  },
      { id: 'mn2', type: 'update',      title: 'Software Update v2.4.1',   message: 'New update available: Improved DICOM viewer and faster image processing pipeline.',   time: '3 hr ago',   read: false, severity: 'info'     },
      { id: 'mn3', type: 'alert',       title: 'Storage Alert',            message: 'Lab storage is at 87% capacity. Please archive old reports or contact IT.',           time: '5 hr ago',   read: false, severity: 'critical' },
      { id: 'mn4', type: 'maintenance', title: 'Backup Complete',          message: 'Daily automated backup completed successfully at 03:00 AM.',                          time: '8 hr ago',   read: true,  severity: 'info'     },
      { id: 'mn5', type: 'update',      title: 'AI Module Updated',        message: 'YOLO v8 dental analysis model updated to version 3.1. Improved accuracy by 4.2%.',   time: '1 day ago',  read: true,  severity: 'info'     },
      { id: 'mn6', type: 'alert',       title: 'CBCT Machine Calibration', message: 'CBCT machine requires calibration. Schedule with biomedical team before next use.',   time: '2 days ago', read: true,  severity: 'warning'  },
    ]).pipe(delay(300));
  }

  getDailyStats() {
    return of({ testsToday: 12, billed: 8, uploaded: 5, pending: 4 }).pipe(delay(200));
  }
}
