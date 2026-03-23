import { Injectable } from '@angular/core';
import { BehaviorSubject, of, delay } from 'rxjs';

// ── Interfaces ────────────────────────────────────────────────────────────────

export interface StaffMember {
  id: string; name: string; role: string; email: string; phone: string;
  branch: string; department?: string; status: 'active' | 'suspended'; online: boolean;
  joinDate: string; avatar?: string; lastSeen?: string;
}

export interface PatientRecord {
  id: string; name: string; email: string; phone: string;
  dob: string; gender: 'M' | 'F'; registeredDate: string;
  lastVisit: string; status: 'active' | 'suspended'; totalVisits: number;
}

export interface InventoryItem {
  id: string; name: string; strength: string; form: string;
  category: string; stock: number; minStock: number; unitPrice: number;
  refillRequested: boolean; requestedBy?: string;
}

export interface TreatmentRate {
  id: string; name: string; code: string; price: number; category: string;
}

export interface XrayRate {
  id: string; name: string; code: string; price: number;
}

export interface Branch {
  id: string; name: string; location: string; revenue: number; patients: number;
}

export interface AppointmentStat {
  date: string; booked: number; completed: number; cancelled: number;
}

export interface RevenueStat {
  period: string; amount: number; branch?: string;
}

export interface AiCreditUsage {
  doctorId: string; doctorName: string; credits: number; period: string;
}

export interface AdminNotification {
  id: string; type: 'issue' | 'subscription' | 'maintenance' | 'warning' | 'ai';
  title: string; message: string; time: string; read: boolean; severity: 'info' | 'warning' | 'critical';
}

export interface SystemLog {
  id: string; userId: string; userName: string; role: string;
  action: 'sign-in' | 'login' | 'logout'; timestamp: string; ip: string;
}

export interface ChatContact {
  id: string; name: string; role: string; branch: string;
  online: boolean; lastMessage: string; unread: number;
}

export interface ChatMessage {
  id: string; contactId: string; text: string; time: string; fromMe: boolean;
}

export interface Feedback {
  id: string; patientName: string; patientId: string; date: string;
  treatmentScore: number; doctorScore: number; facilityScore: number;
  overallScore: number; comment: string; doctorName: string;
}

// ── Service ───────────────────────────────────────────────────────────────────

@Injectable({ providedIn: 'root' })
export class ClinicAdminDataService {

  // ── Overview ───────────────────────────────────────────────────────────────

  getAppointmentStats() {
    return of<AppointmentStat[]>([
      { date: 'Mon', booked: 22, completed: 18, cancelled: 2 },
      { date: 'Tue', booked: 28, completed: 24, cancelled: 3 },
      { date: 'Wed', booked: 19, completed: 15, cancelled: 1 },
      { date: 'Thu', booked: 31, completed: 27, cancelled: 4 },
      { date: 'Fri', booked: 25, completed: 21, cancelled: 2 },
      { date: 'Sat', booked: 14, completed: 12, cancelled: 1 },
      { date: 'Sun', booked: 8,  completed: 7,  cancelled: 0 },
    ]).pipe(delay(200));
  }

  getDailyStats() {
    return of({ booked: 25, completed: 18, cancelled: 2, onlineUsers: 7, totalUsers: 42 }).pipe(delay(150));
  }

  // ── Revenue ────────────────────────────────────────────────────────────────

  getRevenueStats() {
    return of<RevenueStat[]>([
      { period: 'Jan', amount: 48200 }, { period: 'Feb', amount: 52100 },
      { period: 'Mar', amount: 61400 }, { period: 'Apr', amount: 57800 },
      { period: 'May', amount: 63200 }, { period: 'Jun', amount: 71500 },
      { period: 'Jul', amount: 68900 }, { period: 'Aug', amount: 74300 },
      { period: 'Sep', amount: 69100 }, { period: 'Oct', amount: 78600 },
      { period: 'Nov', amount: 82400 }, { period: 'Dec', amount: 91200 },
    ]).pipe(delay(200));
  }

  getBranchRevenue() {
    return of<Branch[]>([
      { id: 'b1', name: 'Main Branch',  location: 'Downtown',   revenue: 91200, patients: 312 },
      { id: 'b2', name: 'North Branch', location: 'Northside',  revenue: 54800, patients: 198 },
      { id: 'b3', name: 'East Branch',  location: 'East Plaza',  revenue: 38600, patients: 143 },
    ]).pipe(delay(200));
  }

  getFinancialSummary() {
    return of({ totalReceived: 244600, totalExpenditure: 89400, pendingAmount: 12300 }).pipe(delay(150));
  }

  // ── Staff ──────────────────────────────────────────────────────────────────

  private staff: StaffMember[] = [
    { id: 'STF-00001', name: 'Dr. Khalid Hassan',  role: 'Doctor',       email: '[email protected]',  phone: '+1 512-555-0201', branch: 'Main Branch',  status: 'active',    online: true,  joinDate: '2023-01-15' },
    { id: 'STF-00002', name: 'Dr. Priya Nair',     role: 'Doctor',       email: '[email protected]',    phone: '+1 512-555-0202', branch: 'Main Branch',  status: 'active',    online: false, joinDate: '2023-03-20', lastSeen: '2h ago' },
    { id: 'STF-00003', name: 'Maya Thompson',      role: 'Receptionist', email: '[email protected]',    phone: '+1 512-555-0199', branch: 'Main Branch',  status: 'active',    online: true,  joinDate: '2022-11-10' },
    { id: 'STF-00004', name: 'Ananya Krishnan',    role: 'Cashier',      email: '[email protected]',  phone: '+1 512-555-0411', branch: 'Main Branch',  status: 'active',    online: true,  joinDate: '2023-06-01' },
    { id: 'STF-00005', name: 'Raj Patel',          role: 'Lab Manager',  email: '[email protected]',      phone: '+1 512-555-0312', branch: 'Main Branch',  status: 'active',    online: false, joinDate: '2023-02-14', lastSeen: '30m ago' },
    { id: 'STF-00006', name: 'Sara Kim',           role: 'Pharmacist',   email: '[email protected]',      phone: '+1 512-555-0508', branch: 'Main Branch',  status: 'active',    online: true,  joinDate: '2023-04-05' },
    { id: 'STF-00007', name: 'Dr. James Osei',     role: 'Doctor',       email: '[email protected]',     phone: '+1 512-555-0703', branch: 'North Branch', status: 'active',    online: true,  joinDate: '2024-01-08' },
    { id: 'STF-00008', name: 'Lena Müller',        role: 'Receptionist', email: '[email protected]',     phone: '+1 512-555-0804', branch: 'North Branch', status: 'suspended', online: false, joinDate: '2023-09-12', lastSeen: '3d ago' },
  ];

  getStaff() { return of([...this.staff]).pipe(delay(250)); }

  updateStaffStatus(id: string, status: 'active' | 'suspended') {
    const s = this.staff.find(m => m.id === id);
    if (s) s.status = status;
    return of(true).pipe(delay(300));
  }

  addStaff(member: Omit<StaffMember, 'id'>) {
    const newMember = { ...member, id: 'STF-' + String(this.staff.length + 1).padStart(5, '0') };
    this.staff.push(newMember);
    return of(newMember).pipe(delay(400));
  }

  // ── Patients ───────────────────────────────────────────────────────────────

  private patients: PatientRecord[] = [
    { id: 'PAT-00101', name: 'Aisha Rahman',   email: '[email protected]',   phone: '+1 512-555-0101', dob: '1996-03-14', gender: 'F', registeredDate: '2024-01-10', lastVisit: '2026-03-17', status: 'active',    totalVisits: 8  },
    { id: 'PAT-00204', name: 'Carlos Mendez',  email: '[email protected]',  phone: '+1 512-555-0204', dob: '1979-07-22', gender: 'M', registeredDate: '2024-03-05', lastVisit: '2026-03-17', status: 'active',    totalVisits: 5  },
    { id: 'PAT-00318', name: 'Priya Sharma',   email: '[email protected]',   phone: '+1 512-555-0318', dob: '1992-11-30', gender: 'F', registeredDate: '2023-11-20', lastVisit: '2026-03-16', status: 'active',    totalVisits: 12 },
    { id: 'PAT-00412', name: 'James Okafor',   email: '[email protected]',  phone: '+1 512-555-0412', dob: '1969-05-18', gender: 'M', registeredDate: '2025-02-14', lastVisit: '2026-02-28', status: 'active',    totalVisits: 3  },
    { id: 'PAT-00521', name: 'Mei Lin',        email: '[email protected]',      phone: '+1 512-555-0521', dob: '2003-08-09', gender: 'F', registeredDate: '2025-06-01', lastVisit: '2026-01-15', status: 'active',    totalVisits: 2  },
    { id: 'PAT-00633', name: 'David Osei',     email: '[email protected]',    phone: '+1 512-555-0633', dob: '1987-12-03', gender: 'M', registeredDate: '2024-09-18', lastVisit: '2025-12-10', status: 'suspended', totalVisits: 6  },
  ];

  getPatients() { return of([...this.patients]).pipe(delay(250)); }

  updatePatientStatus(id: string, status: 'active' | 'suspended') {
    const p = this.patients.find(m => m.id === id);
    if (p) p.status = status;
    return of(true).pipe(delay(300));
  }

  // ── Inventory ──────────────────────────────────────────────────────────────

  private inventory: InventoryItem[] = [
    { id: 'm1',  name: 'Amoxicillin',   strength: '500mg', form: 'Capsule',   category: 'Antibiotic',  stock: 120, minStock: 30, unitPrice: 0.45, refillRequested: false },
    { id: 'm2',  name: 'Ibuprofen',     strength: '400mg', form: 'Tablet',    category: 'NSAID',       stock: 200, minStock: 50, unitPrice: 0.20, refillRequested: false },
    { id: 'm3',  name: 'Metronidazole', strength: '400mg', form: 'Tablet',    category: 'Antibiotic',  stock: 80,  minStock: 30, unitPrice: 0.35, refillRequested: false },
    { id: 'm4',  name: 'Paracetamol',   strength: '500mg', form: 'Tablet',    category: 'Analgesic',   stock: 300, minStock: 60, unitPrice: 0.10, refillRequested: false },
    { id: 'm5',  name: 'Lidocaine',     strength: '2%',    form: 'Injection', category: 'Anesthetic',  stock: 30,  minStock: 20, unitPrice: 5.00, refillRequested: false },
    { id: 'm6',  name: 'Chlorhexidine', strength: '0.2%',  form: 'Liquid',    category: 'Antiseptic',  stock: 45,  minStock: 15, unitPrice: 3.50, refillRequested: false },
    { id: 'm7',  name: 'Tetracycline',  strength: '250mg', form: 'Capsule',   category: 'Antibiotic',  stock: 0,   minStock: 20, unitPrice: 0.55, refillRequested: true,  requestedBy: 'Sara Kim' },
    { id: 'm8',  name: 'Erythromycin',  strength: '500mg', form: 'Tablet',    category: 'Antibiotic',  stock: 5,   minStock: 20, unitPrice: 0.70, refillRequested: true,  requestedBy: 'Sara Kim' },
    { id: 'm9',  name: 'Fluoride Gel',  strength: '1.1%',  form: 'Topical',   category: 'Preventive',  stock: 25,  minStock: 10, unitPrice: 8.00, refillRequested: false },
    { id: 'm10', name: 'Benzocaine',    strength: '20%',   form: 'Topical',   category: 'Anesthetic',  stock: 18,  minStock: 10, unitPrice: 6.50, refillRequested: false },
  ];

  getInventory() { return of([...this.inventory]).pipe(delay(200)); }

  refillInventory(id: string, qty: number, price: number) {
    const item = this.inventory.find(i => i.id === id);
    if (item) { item.stock += qty; item.unitPrice = price; item.refillRequested = false; }
    return of(true).pipe(delay(400));
  }

  // ── Treatment Rates ────────────────────────────────────────────────────────

  private treatments: TreatmentRate[] = [
    { id: 't1', name: 'Simple Extraction',          code: 'EXT-S',  price: 120,  category: 'Surgical'     },
    { id: 't2', name: 'Surgical Extraction',         code: 'EXT-SG', price: 280,  category: 'Surgical'     },
    { id: 't3', name: 'Cleaning & Disinfection',     code: 'CLN',    price: 80,   category: 'Preventive'   },
    { id: 't4', name: 'Root Canal',                  code: 'RCT',    price: 350,  category: 'Endodontic'   },
    { id: 't5', name: 'Sealing & Restoration',       code: 'SEAL',   price: 90,   category: 'Restorative'  },
    { id: 't6', name: 'Crowning',                    code: 'CROWN',  price: 650,  category: 'Prosthetic'   },
  ];

  private xrays: XrayRate[] = [
    { id: 'x1', name: 'Bitewing',          code: 'BW',   price: 35  },
    { id: 'x2', name: 'Periapical (IOPA)', code: 'PA',   price: 30  },
    { id: 'x3', name: 'Panoramic (OPG)',   code: 'OPG',  price: 80  },
    { id: 'x4', name: 'Cone-Beam CT (CBCT)', code: 'CBCT', price: 250 },
    { id: 'x5', name: 'Cephalometric',     code: 'CEPH', price: 90  },
    { id: 'x6', name: 'Occlusal',          code: 'OCC',  price: 40  },
  ];

  getTreatments() { return of([...this.treatments]).pipe(delay(150)); }
  getXrays()      { return of([...this.xrays]).pipe(delay(150)); }

  updateTreatmentPrice(id: string, price: number) {
    const t = this.treatments.find(x => x.id === id);
    if (t) t.price = price;
    return of(true).pipe(delay(200));
  }

  updateXrayPrice(id: string, price: number) {
    const x = this.xrays.find(r => r.id === id);
    if (x) x.price = price;
    return of(true).pipe(delay(200));
  }

  // ── AI Credits ─────────────────────────────────────────────────────────────

  getAiCreditUsage() {
    return of<AiCreditUsage[]>([
      { doctorId: 'STF-00001', doctorName: 'Dr. Khalid Hassan', credits: 340, period: 'Mar 2026' },
      { doctorId: 'STF-00002', doctorName: 'Dr. Priya Nair',    credits: 210, period: 'Mar 2026' },
      { doctorId: 'STF-00007', doctorName: 'Dr. James Osei',    credits: 180, period: 'Mar 2026' },
    ]).pipe(delay(200));
  }

  getAiCreditPeriodStats() {
    return of([
      { period: 'Oct', credits: 620 }, { period: 'Nov', credits: 710 },
      { period: 'Dec', credits: 890 }, { period: 'Jan', credits: 740 },
      { period: 'Feb', credits: 820 }, { period: 'Mar', credits: 730 },
    ]).pipe(delay(200));
  }

  getAiPlanLimit() { return of({ used: 730, total: 1000 }).pipe(delay(100)); }

  // ── Notifications ──────────────────────────────────────────────────────────

  getNotifications() {
    return of<AdminNotification[]>([
      { id: 'n1', type: 'issue',        title: 'Issue Reported',        message: 'Dr. Khalid reported login issue on mobile.',          time: '09:15', read: false, severity: 'warning'  },
      { id: 'n2', type: 'subscription', title: 'Plan Expiry Warning',   message: 'Your Pro plan expires in 7 days.',                    time: '08:00', read: false, severity: 'critical' },
      { id: 'n3', type: 'warning',      title: 'User Limit Reached',    message: '38/40 users registered. Approaching plan limit.',     time: '07:30', read: false, severity: 'warning'  },
      { id: 'n4', type: 'ai',           title: 'AI Credits Warning',    message: '73% of AI credits used this month.',                  time: '10:00', read: false, severity: 'warning'  },
      { id: 'n5', type: 'maintenance',  title: 'System Maintenance',    message: 'Scheduled downtime Sunday 2–4 AM.',                   time: '06:00', read: true,  severity: 'info'     },
      { id: 'n6', type: 'issue',        title: 'Pharmacist Report',     message: 'Sara Kim: Tetracycline out of stock.',                time: '11:20', read: true,  severity: 'critical' },
    ]).pipe(delay(150));
  }

  // ── Logs ───────────────────────────────────────────────────────────────────

  getLogs() {
    return of<SystemLog[]>([
      { id: 'l1',  userId: 'STF-00001', userName: 'Dr. Khalid Hassan', role: 'Doctor',       action: 'login',   timestamp: '2026-03-17 08:02', ip: '192.168.1.10' },
      { id: 'l2',  userId: 'STF-00003', userName: 'Maya Thompson',     role: 'Receptionist', action: 'login',   timestamp: '2026-03-17 08:15', ip: '192.168.1.12' },
      { id: 'l3',  userId: 'STF-00004', userName: 'Ananya Krishnan',   role: 'Cashier',      action: 'login',   timestamp: '2026-03-17 08:30', ip: '192.168.1.14' },
      { id: 'l4',  userId: 'STF-00005', userName: 'Raj Patel',         role: 'Lab Manager',  action: 'login',   timestamp: '2026-03-17 08:45', ip: '192.168.1.15' },
      { id: 'l5',  userId: 'STF-00006', userName: 'Sara Kim',          role: 'Pharmacist',   action: 'login',   timestamp: '2026-03-17 09:00', ip: '192.168.1.16' },
      { id: 'l6',  userId: 'STF-00002', userName: 'Dr. Priya Nair',    role: 'Doctor',       action: 'login',   timestamp: '2026-03-17 09:10', ip: '192.168.1.11' },
      { id: 'l7',  userId: 'STF-00008', userName: 'Lena Müller',       role: 'Receptionist', action: 'login',   timestamp: '2026-03-17 09:25', ip: '192.168.1.20' },
      { id: 'l8',  userId: 'STF-00008', userName: 'Lena Müller',       role: 'Receptionist', action: 'logout',  timestamp: '2026-03-17 09:40', ip: '192.168.1.20' },
      { id: 'l9',  userId: 'STF-00005', userName: 'Raj Patel',         role: 'Lab Manager',  action: 'logout',  timestamp: '2026-03-17 17:00', ip: '192.168.1.15' },
      { id: 'l10', userId: 'STF-00003', userName: 'Maya Thompson',     role: 'Receptionist', action: 'logout',  timestamp: '2026-03-17 17:30', ip: '192.168.1.12' },
    ]).pipe(delay(200));
  }

  // ── Chat ───────────────────────────────────────────────────────────────────

  getChatContacts() {
    return of<ChatContact[]>([
      { id: 'c1', name: 'Dr. Khalid Hassan', role: 'Doctor',       branch: 'Main Branch',  online: true,  lastMessage: 'Patient DM-002 needs priority.',    unread: 2 },
      { id: 'c2', name: 'Maya Thompson',     role: 'Receptionist', branch: 'Main Branch',  online: true,  lastMessage: 'Queue is full for today.',           unread: 1 },
      { id: 'c3', name: 'Ananya Krishnan',   role: 'Cashier',      branch: 'Main Branch',  online: true,  lastMessage: 'Daily report ready.',                unread: 0 },
      { id: 'c4', name: 'Sara Kim',          role: 'Pharmacist',   branch: 'Main Branch',  online: true,  lastMessage: 'Tetracycline refill needed urgently.', unread: 3 },
      { id: 'c5', name: 'Raj Patel',         role: 'Lab Manager',  branch: 'Main Branch',  online: false, lastMessage: 'Lab results uploaded.',              unread: 0 },
      { id: 'c6', name: 'Dr. James Osei',    role: 'Doctor',       branch: 'North Branch', online: true,  lastMessage: 'North branch stats for March.',      unread: 0 },
    ]).pipe(delay(100));
  }

  getChatMessages(contactId: string) {
    const msgs: Record<string, ChatMessage[]> = {
      'c1': [
        { id: 'm1', contactId: 'c1', text: 'Good morning Dr. Hassan. How is the queue today?', time: '08:05', fromMe: true },
        { id: 'm2', contactId: 'c1', text: 'Morning! Quite busy. Patient DM-002 needs priority.', time: '08:07', fromMe: false },
        { id: 'm3', contactId: 'c1', text: 'Noted. I will inform the receptionist.', time: '08:08', fromMe: true },
      ],
      'c4': [
        { id: 'm4', contactId: 'c4', text: 'Tetracycline is completely out of stock.', time: '09:10', fromMe: false },
        { id: 'm5', contactId: 'c4', text: 'Raising a PO today. Should arrive by Thursday.', time: '09:15', fromMe: true },
        { id: 'm6', contactId: 'c4', text: 'Also Erythromycin is critically low — only 5 units.', time: '09:16', fromMe: false },
        { id: 'm7', contactId: 'c4', text: 'Adding to the order. Thanks for the heads up.', time: '09:18', fromMe: true },
      ],
    };
    return of(msgs[contactId] ?? []).pipe(delay(100));
  }

  // ── Feedbacks ──────────────────────────────────────────────────────────────

  getFeedbacks() {
    return of<Feedback[]>([
      { id: 'f1', patientName: 'Aisha Rahman',  patientId: 'PAT-00101', date: '2026-03-17', treatmentScore: 5, doctorScore: 5, facilityScore: 4, overallScore: 5, comment: 'Excellent service! Dr. Hassan was very thorough.', doctorName: 'Dr. Khalid Hassan' },
      { id: 'f2', patientName: 'Carlos Mendez', patientId: 'PAT-00204', date: '2026-03-16', treatmentScore: 4, doctorScore: 4, facilityScore: 3, overallScore: 4, comment: 'Good experience overall. Waiting time was a bit long.', doctorName: 'Dr. Priya Nair' },
      { id: 'f3', patientName: 'Priya Sharma',  patientId: 'PAT-00318', date: '2026-03-15', treatmentScore: 5, doctorScore: 5, facilityScore: 5, overallScore: 5, comment: 'Best dental clinic I have visited. Highly recommend!', doctorName: 'Dr. Khalid Hassan' },
      { id: 'f4', patientName: 'James Okafor',  patientId: 'PAT-00412', date: '2026-03-14', treatmentScore: 3, doctorScore: 4, facilityScore: 3, overallScore: 3, comment: 'Treatment was fine but the facility needs improvement.', doctorName: 'Dr. James Osei' },
    ]).pipe(delay(200));
  }

  // ── Subscription ───────────────────────────────────────────────────────────

  getSubscription() {
    return of({
      plan: 'Pro', expiryDate: '2026-04-14', pendingAmount: 0,
      usersUsed: 38, usersLimit: 40, aiCreditsUsed: 730, aiCreditsLimit: 1000,
      price: 299, billingCycle: 'monthly',
    }).pipe(delay(150));
  }
}
