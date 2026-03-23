import { Injectable } from '@angular/core';
import { BehaviorSubject, of, delay, Subject } from 'rxjs';
import { MedStock } from './doctor-data.service';

// ── Interfaces ────────────────────────────────────────────────────────────────

export interface DigitalPrescription {
  visitId: string;
  patientId: string;
  patientName: string;
  patientEmail: string;
  patientPhone: string;
  doctor: string;
  visitDate: string;
  billStatus: 'paid' | 'pending' | 'partial';
  paidAt?: string;
  delivered: boolean;
  deliveredAt?: string;
  items: PrescriptionDeliveryItem[];
}

export interface PrescriptionDeliveryItem {
  id: string;
  name: string;
  strength: string;
  form: string;
  dosage: string;
  qty: number;
  days: string;
  notes: string;
}

export interface PharmacyInventoryItem {
  id: string;
  name: string;
  strength: string;
  form: string;
  category: string;
  stock: number;
  minStock: number;
  unitPrice: number;
}

export interface PharmacyChatContact {
  id: string;
  name: string;
  role: 'admin' | 'doctor' | 'cashier' | 'receptionist' | 'lab';
  branch: string;
  online: boolean;
  lastMessage: string;
  unread: number;
}

export interface PharmacyChatMessage {
  id: string;
  contactId: string;
  text: string;
  time: string;
  fromMe: boolean;
}

export interface PharmacyNotification {
  id: string;
  type: 'maintenance' | 'refill' | 'delivery' | 'alert';
  title: string;
  message: string;
  time: string;
  read: boolean;
  severity: 'info' | 'warning' | 'critical';
}

// ── Service ───────────────────────────────────────────────────────────────────

@Injectable({ providedIn: 'root' })
export class PharmacistDataService {

  // WebSocket simulation: emits patientId when cashier marks bill as paid
  private _paymentConfirmed = new Subject<string>();
  paymentConfirmed$ = this._paymentConfirmed.asObservable();

  // Simulate real-time payment update (called by cashier service in real app)
  simulatePayment(patientId: string): void { this._paymentConfirmed.next(patientId); }

  // ── Prescriptions ──────────────────────────────────────────────────────────

  private prescriptions: DigitalPrescription[] = [
    {
      visitId: 'V-2026-0312', patientId: 'PAT-00101', patientName: 'Aisha Rahman',
      patientEmail: '[email protected]', patientPhone: '+1 512-555-0101',
      doctor: 'Dr. Khalid Hassan', visitDate: '2026-03-17',
      billStatus: 'paid', paidAt: '2026-03-17 10:42', delivered: false,
      items: [
        { id: 'pi1', name: 'Amoxicillin', strength: '500mg', form: 'Capsule',
          dosage: 'Morning & Night', qty: 21, days: '7 days', notes: '' },
        { id: 'pi2', name: 'Ibuprofen', strength: '400mg', form: 'Tablet',
          dosage: 'After meals', qty: 15, days: '5 days', notes: 'Take after food' },
      ]
    },
    {
      visitId: 'V-2026-0311', patientId: 'PAT-00204', patientName: 'Carlos Mendez',
      patientEmail: '[email protected]', patientPhone: '+1 512-555-0204',
      doctor: 'Dr. Priya Nair', visitDate: '2026-03-17',
      billStatus: 'pending', delivered: false,
      items: [
        { id: 'pi3', name: 'Metronidazole', strength: '400mg', form: 'Tablet',
          dosage: 'Three times daily', qty: 21, days: '7 days', notes: '' },
        { id: 'pi4', name: 'Chlorhexidine', strength: '0.2%', form: 'Liquid',
          dosage: 'Rinse twice daily', qty: 2, days: '14 days', notes: '10ml per rinse' },
      ]
    },
    {
      visitId: 'V-2026-0310', patientId: 'PAT-00318', patientName: 'Priya Sharma',
      patientEmail: '[email protected]', patientPhone: '+1 512-555-0318',
      doctor: 'Dr. Khalid Hassan', visitDate: '2026-03-16',
      billStatus: 'paid', paidAt: '2026-03-16 15:10', delivered: true, deliveredAt: '2026-03-16 15:35',
      items: [
        { id: 'pi5', name: 'Paracetamol', strength: '500mg', form: 'Tablet',
          dosage: 'As needed', qty: 10, days: '5 days', notes: 'Max 4 per day' },
      ]
    },
  ];

  getPrescriptionByPatientId(patientId: string) {
    const rx = this.prescriptions.find(p => p.patientId === patientId) ?? null;
    return of(rx).pipe(delay(400));
  }

  markDelivered(visitId: string) {
    const rx = this.prescriptions.find(p => p.visitId === visitId);
    if (rx) { rx.delivered = true; rx.deliveredAt = new Date().toLocaleString(); }
    return of(true).pipe(delay(300));
  }

  updateBillStatus(patientId: string, status: 'paid' | 'pending' | 'partial') {
    const rx = this.prescriptions.find(p => p.patientId === patientId);
    if (rx) { rx.billStatus = status; if (status === 'paid') rx.paidAt = new Date().toLocaleString(); }
  }

  // ── Inventory ──────────────────────────────────────────────────────────────

  private inventory: PharmacyInventoryItem[] = [
    { id: 'm1',  name: 'Amoxicillin',   strength: '500mg', form: 'Capsule',   category: 'Antibiotic',  stock: 120, minStock: 30, unitPrice: 0.45 },
    { id: 'm2',  name: 'Ibuprofen',     strength: '400mg', form: 'Tablet',    category: 'NSAID',       stock: 200, minStock: 50, unitPrice: 0.20 },
    { id: 'm3',  name: 'Metronidazole', strength: '400mg', form: 'Tablet',    category: 'Antibiotic',  stock: 80,  minStock: 30, unitPrice: 0.35 },
    { id: 'm4',  name: 'Paracetamol',   strength: '500mg', form: 'Tablet',    category: 'Analgesic',   stock: 300, minStock: 60, unitPrice: 0.10 },
    { id: 'm5',  name: 'Clindamycin',   strength: '300mg', form: 'Capsule',   category: 'Antibiotic',  stock: 60,  minStock: 20, unitPrice: 0.80 },
    { id: 'm6',  name: 'Chlorhexidine', strength: '0.2%',  form: 'Liquid',    category: 'Antiseptic',  stock: 45,  minStock: 15, unitPrice: 3.50 },
    { id: 'm7',  name: 'Lidocaine',     strength: '2%',    form: 'Injection', category: 'Anesthetic',  stock: 30,  minStock: 20, unitPrice: 5.00 },
    { id: 'm8',  name: 'Diclofenac',    strength: '50mg',  form: 'Tablet',    category: 'NSAID',       stock: 150, minStock: 40, unitPrice: 0.25 },
    { id: 'm9',  name: 'Dexamethasone', strength: '4mg',   form: 'Tablet',    category: 'Steroid',     stock: 40,  minStock: 15, unitPrice: 0.60 },
    { id: 'm10', name: 'Omeprazole',    strength: '20mg',  form: 'Capsule',   category: 'PPI',         stock: 90,  minStock: 25, unitPrice: 0.30 },
    { id: 'm11', name: 'Fluoride Gel',  strength: '1.1%',  form: 'Topical',   category: 'Preventive',  stock: 25,  minStock: 10, unitPrice: 8.00 },
    { id: 'm12', name: 'Benzocaine',    strength: '20%',   form: 'Topical',   category: 'Anesthetic',  stock: 18,  minStock: 10, unitPrice: 6.50 },
    { id: 'm13', name: 'Tetracycline',  strength: '250mg', form: 'Capsule',   category: 'Antibiotic',  stock: 0,   minStock: 20, unitPrice: 0.55 },
    { id: 'm14', name: 'Erythromycin',  strength: '500mg', form: 'Tablet',    category: 'Antibiotic',  stock: 5,   minStock: 20, unitPrice: 0.70 },
  ];

  getInventory() { return of([...this.inventory]).pipe(delay(200)); }

  decrementStock(itemId: string, qty: number) {
    const item = this.inventory.find(i => i.id === itemId);
    if (item) item.stock = Math.max(0, item.stock - qty);
    return of(true).pipe(delay(100));
  }

  sendRefillRequest(itemId: string) {
    return of({ success: true, message: 'Refill request sent to Clinic Admin.' }).pipe(delay(500));
  }

  // ── Chat ───────────────────────────────────────────────────────────────────

  getChatContacts() {
    return of<PharmacyChatContact[]>([
      { id: 'c1', name: 'Dr. Khalid Hassan', role: 'doctor',       branch: 'Main Branch',  online: true,  lastMessage: 'Please prepare Amoxicillin for PAT-00101', unread: 2 },
      { id: 'c2', name: 'Dr. Admin',         role: 'admin',        branch: 'All Branches', online: true,  lastMessage: 'Stock audit scheduled for Friday',         unread: 1 },
      { id: 'c3', name: 'Ananya Krishnan',   role: 'cashier',      branch: 'Main Branch',  online: true,  lastMessage: 'PAT-00101 bill is now paid',               unread: 0 },
      { id: 'c4', name: 'Maya Thompson',     role: 'receptionist', branch: 'Main Branch',  online: false, lastMessage: 'Patient is on the way to pharmacy',        unread: 0 },
      { id: 'c5', name: 'Lab Manager',       role: 'lab',          branch: 'Main Branch',  online: true,  lastMessage: 'Lab results ready for Aisha Rahman',       unread: 0 },
    ]).pipe(delay(100));
  }

  getChatMessages(contactId: string) {
    const msgs: Record<string, PharmacyChatMessage[]> = {
      'c1': [
        { id: 'm1', contactId: 'c1', text: 'Please prepare Amoxicillin 500mg x21 for PAT-00101.', time: '10:30', fromMe: false },
        { id: 'm2', contactId: 'c1', text: 'Ready. Waiting for payment confirmation.', time: '10:32', fromMe: true },
        { id: 'm3', contactId: 'c1', text: 'Bill has been processed by cashier.', time: '10:44', fromMe: false },
      ],
      'c2': [
        { id: 'm4', contactId: 'c2', text: 'Tetracycline is out of stock. Need urgent refill.', time: '09:15', fromMe: true },
        { id: 'm5', contactId: 'c2', text: 'Noted. Raising PO today.', time: '09:20', fromMe: false },
      ],
      'c3': [
        { id: 'm6', contactId: 'c3', text: 'PAT-00101 bill is now paid. You can proceed.', time: '10:42', fromMe: false },
        { id: 'm7', contactId: 'c3', text: 'Thanks, delivering now.', time: '10:43', fromMe: true },
      ],
    };
    return of(msgs[contactId] ?? []).pipe(delay(100));
  }

  // ── Notifications ──────────────────────────────────────────────────────────

  getNotifications() {
    return of<PharmacyNotification[]>([
      { id: 'n1', type: 'maintenance', title: 'System Maintenance',   message: 'Scheduled downtime Sunday 2–4 AM.',          time: '08:00', read: false, severity: 'warning'  },
      { id: 'n2', type: 'refill',      title: 'Low Stock Alert',      message: 'Tetracycline 250mg is out of stock.',         time: '09:10', read: false, severity: 'critical' },
      { id: 'n3', type: 'delivery',    title: 'Delivery Confirmed',   message: 'Prescription V-2026-0310 delivered.',         time: '15:35', read: true,  severity: 'info'     },
      { id: 'n4', type: 'alert',       title: 'Erythromycin Critical', message: 'Only 5 units left. Refill immediately.',     time: '10:05', read: false, severity: 'critical' },
      { id: 'n5', type: 'maintenance', title: 'Software Update',      message: 'DentaMate v3.2.1 deployed successfully.',     time: '07:30', read: true,  severity: 'info'     },
    ]).pipe(delay(150));
  }
}
