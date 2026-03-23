import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { trigger, transition, style, animate } from '@angular/animations';
import { ReceptionistDataService, UnavailableDate } from '../../../../core/services/receptionist-data.service';
import { ClinicSettingsService } from '../../../../core/services/clinic-settings.service';

interface CalendarDay { date: Date; dateStr: string; inMonth: boolean; isToday: boolean; isUnavailable: boolean; isSelected: boolean; }

@Component({
  selector: 'app-rec-appointments',
  templateUrl: './rec-appointments.component.html',
  styleUrls: ['./rec-appointments.component.scss'],
  animations: [
    trigger('slideIn', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateX(12px)' }),
        animate('250ms ease', style({ opacity: 1, transform: 'translateX(0)' }))
      ])
    ])
  ]
})
export class RecAppointmentsComponent implements OnInit {
  bookingForm!: FormGroup;
  doctors: { id: string; name: string; specialty: string; avatar: string }[] = [];
  unavailableDates: UnavailableDate[] = [];
  calendarDays: CalendarDay[] = [];
  calendarMonth = new Date();
  selectedDate = '';
  selectedDoctorId = '';
  consultationFee = 0;
  showConfirm = false;
  confirmedToken = '';
  confirmedFee = 0;

  weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  constructor(private data: ReceptionistDataService, private fb: FormBuilder, private clinicSettings: ClinicSettingsService) {}

  ngOnInit(): void {
    this.clinicSettings.consultationFee$.subscribe(fee => this.consultationFee = fee);
    this.data.getAllDoctors().subscribe(d => this.doctors = d);
    this.data.getUnavailableDates().subscribe(u => {
      this.unavailableDates = u;
      this.buildCalendar();
    });

    this.bookingForm = this.fb.group({
      patientName: [''],
      patientId:   ['', [Validators.required, Validators.pattern(/^DM-\d{5}$/)]],
      doctor:      ['', Validators.required],
      date:        ['', Validators.required],
      time:        ['', Validators.required],
      notes:       ['']
    });

    this.bookingForm.get('doctor')!.valueChanges.subscribe(id => {
      this.selectedDoctorId = id;
      this.buildCalendar();
    });
  }

  buildCalendar(): void {
    const year  = this.calendarMonth.getFullYear();
    const month = this.calendarMonth.getMonth();
    const first = new Date(year, month, 1);
    const last  = new Date(year, month + 1, 0);
    const days: CalendarDay[] = [];
    const today = new Date(); today.setHours(0,0,0,0);

    // Pad start
    for (let i = 0; i < first.getDay(); i++) {
      const d = new Date(year, month, -first.getDay() + i + 1);
      days.push(this.makeDay(d, false, today));
    }
    for (let d = 1; d <= last.getDate(); d++) {
      days.push(this.makeDay(new Date(year, month, d), true, today));
    }
    // Pad end
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      days.push(this.makeDay(new Date(year, month + 1, i), false, today));
    }
    this.calendarDays = days;
  }

  private makeDay(date: Date, inMonth: boolean, today: Date): CalendarDay {
    const dateStr = this.toDateStr(date);
    const isUnavailable = this.selectedDoctorId
      ? this.unavailableDates.some(u => u.doctorId === this.selectedDoctorId && u.date === dateStr)
      : false;
    return { date, dateStr, inMonth, isToday: date.getTime() === today.getTime(), isUnavailable, isSelected: this.selectedDate === dateStr };
  }

  private toDateStr(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  }

  prevMonth(): void { this.calendarMonth = new Date(this.calendarMonth.getFullYear(), this.calendarMonth.getMonth() - 1, 1); this.buildCalendar(); }
  nextMonth(): void { this.calendarMonth = new Date(this.calendarMonth.getFullYear(), this.calendarMonth.getMonth() + 1, 1); this.buildCalendar(); }

  selectDay(day: CalendarDay): void {
    if (!day.inMonth || day.isUnavailable) return;
    this.selectedDate = day.dateStr;
    this.bookingForm.patchValue({ date: day.dateStr });
    this.buildCalendar();
  }

  get calendarTitle(): string {
    return this.calendarMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }

  submitBooking(): void {
    if (this.bookingForm.invalid) { this.bookingForm.markAllAsTouched(); return; }
    const token = `DM-${String(Math.floor(Math.random() * 900) + 100)}`;
    this.confirmedToken = token;
    this.confirmedFee = this.consultationFee;
    this.showConfirm = true;
    this.bookingForm.reset();
    this.selectedDate = '';
    this.buildCalendar();
  }

  closeConfirm(): void { this.showConfirm = false; }
}
