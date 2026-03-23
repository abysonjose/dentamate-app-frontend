import { Component, Input, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { trigger, transition, style, animate } from '@angular/animations';
import { DashboardDataService, Appointment, Department, Doctor, TimeSlot } from '../../../../core/services/dashboard-data.service';
import { ClinicSettingsService } from '../../../../core/services/clinic-settings.service';

type BookingStep = 'details' | 'slots' | 'payment' | 'token';

@Component({
  selector: 'app-appointments',
  templateUrl: './appointments.component.html',
  styleUrls: ['./appointments.component.scss'],
  animations: [
    trigger('modalAnim', [
      transition(':enter', [
        style({ opacity: 0, transform: 'scale(0.95) translateY(10px)' }),
        animate('250ms cubic-bezier(0.35,0,0.25,1)', style({ opacity: 1, transform: 'scale(1) translateY(0)' }))
      ]),
      transition(':leave', [
        animate('180ms ease', style({ opacity: 0, transform: 'scale(0.95)' }))
      ])
    ]),
    trigger('stepAnim', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateX(18px)' }),
        animate('260ms cubic-bezier(0.35,0,0.25,1)', style({ opacity: 1, transform: 'translateX(0)' }))
      ]),
      transition(':leave', [
        animate('160ms ease', style({ opacity: 0, transform: 'translateX(-18px)' }))
      ])
    ])
  ]
})
export class AppointmentsComponent implements OnInit {
  @Input() fullView = false;

  appointment: Appointment | null = null;
  loading = true;
  showModal = false;

  // Booking wizard state
  bookingStep: BookingStep = 'details';
  departments: Department[] = [];
  doctors: Doctor[] = [];
  timeSlots: TimeSlot[] = [];
  selectedSlot: TimeSlot | null = null;
  isLoadingSlots = false;
  bookedToken = '';
  consultationFee = 0;
  selectedPaymentMethod: 'card' | 'upi' | 'netbanking' = 'card';
  isProcessingPayment = false;

  detailsForm!: FormGroup;

  constructor(private data: DashboardDataService, private fb: FormBuilder, private clinicSettings: ClinicSettingsService) {}

  ngOnInit(): void {
    this.clinicSettings.consultationFee$.subscribe(fee => this.consultationFee = fee);
    this.data.getAppointment().subscribe(a => { this.appointment = a; this.loading = false; });
    this.data.getDepartments().subscribe(d => this.departments = d);

    this.detailsForm = this.fb.group({
      department: ['', Validators.required],
      doctor:     ['', Validators.required],
      date:       ['', Validators.required],
      notes:      ['']
    });

    // Reset doctor when department changes
    this.detailsForm.get('department')!.valueChanges.subscribe(id => {
      this.detailsForm.get('doctor')!.reset('');
      this.doctors = [];
      if (id) this.data.getDoctors(id).subscribe(d => this.doctors = d);
    });

    // Reset slots when doctor or date changes
    this.detailsForm.get('doctor')!.valueChanges.subscribe(() => this.timeSlots = []);
    this.detailsForm.get('date')!.valueChanges.subscribe(() => this.timeSlots = []);
  }

  openModal(): void {
    this.showModal = true;
    this.bookingStep = 'details';
    this.selectedSlot = null;
    this.timeSlots = [];
    this.bookedToken = '';
    this.selectedPaymentMethod = 'card';
    this.isProcessingPayment = false;
    this.detailsForm.reset();
    this.doctors = [];
  }

  closeModal(): void { this.showModal = false; }

  // Step 1 → Step 2: load time slots
  proceedToSlots(): void {
    if (this.detailsForm.invalid) { this.detailsForm.markAllAsTouched(); return; }
    const { doctor, date } = this.detailsForm.value;
    this.isLoadingSlots = true;
    this.timeSlots = [];
    // Simulate async fetch
    setTimeout(() => {
      this.timeSlots = this.data.getTimeSlots(doctor, date);
      this.isLoadingSlots = false;
      this.bookingStep = 'slots';
    }, 600);
  }

  selectSlot(slot: TimeSlot): void {
    if (slot.available === 0) return;
    this.selectedSlot = slot;
  }

  // Step 2 → Step 3: go to payment
  confirmSlot(): void {
    if (!this.selectedSlot) return;
    this.bookingStep = 'payment';
  }

  // Step 3: simulate payment and generate token
  processPayment(): void {
    this.isProcessingPayment = true;
    setTimeout(() => {
      const token = `${this.selectedSlot!.tokenPrefix}-${String(this.selectedSlot!.tokenNumber).padStart(3, '0')}`;
      this.bookedToken = token;
      this.isProcessingPayment = false;
      this.bookingStep = 'token';
    }, 1200);
  }

  backToSlots(): void {
    this.bookingStep = 'slots';
  }

  backToDetails(): void {
    this.bookingStep = 'details';
    this.selectedSlot = null;
  }

  get selectedDoctor(): Doctor | undefined {
    return this.doctors.find(d => d.id === this.detailsForm.get('doctor')?.value);
  }

  get selectedDept(): Department | undefined {
    return this.departments.find(d => d.id === this.detailsForm.get('department')?.value);
  }

  get formattedDate(): string {
    const raw = this.detailsForm.get('date')?.value;
    if (!raw) return '';
    return new Date(raw + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
  }

  get statusColor(): string {
    return this.appointment?.status === 'confirmed' ? 'text-teal-400' : 'text-yellow-400';
  }

  get today(): string {
    return new Date().toISOString().split('T')[0];
  }

  slotFillPercent(slot: TimeSlot): number {
    return Math.round(((slot.total - slot.available) / slot.total) * 100);
  }
}
