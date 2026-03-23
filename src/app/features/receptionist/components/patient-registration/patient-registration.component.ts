import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { trigger, transition, style, animate } from '@angular/animations';
import { ThemeService, Theme } from '../../../../core/services/theme.service';

export interface RegisteredPatient {
  id: string;
  name: string;
  phone: string;
  email: string;
  dob: string;
  gender: string;
  address: string;
  doctor: string;
  department: string;
  registeredOn: string;
  status: 'active';
}

@Component({
  selector: 'app-patient-registration',
  templateUrl: './patient-registration.component.html',
  styleUrls: ['./patient-registration.component.scss'],
  animations: [
    trigger('fadeUp', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(16px)' }),
        animate('340ms cubic-bezier(0.35,0,0.25,1)', style({ opacity: 1, transform: 'translateY(0)' }))
      ])
    ])
  ]
})
export class PatientRegistrationComponent implements OnInit {
  theme: Theme = 'dark';
  form!: FormGroup;
  submitted = false;
  successPatient: RegisteredPatient | null = null;

  constructor(
    private fb: FormBuilder,
    public themeService: ThemeService
  ) {}

  ngOnInit(): void {
    this.themeService.theme$.subscribe(t => this.theme = t);

    this.form = this.fb.group({
      firstName:  ['', [Validators.required, Validators.minLength(2)]],
      lastName:   ['', [Validators.required, Validators.minLength(2)]],
      dob:        ['', Validators.required],
      gender:     ['', Validators.required],
      phone:      ['', [Validators.required, Validators.pattern(/^\+?[\d\s\-()]{7,15}$/)]],
      email:      ['', [Validators.required, Validators.email]],
      address:    ['', Validators.required],
    });
  }

  get f() { return this.form.controls; }

  private generateId(): string {
    return 'DM-' + (20490 + Math.floor(Math.random() * 1000));
  }

  register(): void {
    this.submitted = true;
    if (this.form.invalid) return;

    const v = this.form.getRawValue();

    this.successPatient = {
      id:           this.generateId(),
      name:         `${v.firstName} ${v.lastName}`,
      phone:        v.phone,
      email:        v.email,
      dob:          v.dob,
      gender:       v.gender,
      address:      v.address,
      doctor:       '',
      department:   '',
      registeredOn: new Date().toISOString().split('T')[0],
      status:       'active',
    };

    this.form.reset();
    this.submitted = false;
  }

  registerAnother(): void {
    this.successPatient = null;
  }

  getIcon(name: string): string {
    const icons: Record<string, string> = {
      user:    `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`,
      check:   `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>`,
      plus:    `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`,
      id:      `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 3H8a2 2 0 00-2 2v2h12V5a2 2 0 00-2-2z"/></svg>`,
      copy:    `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>`,
    };
    return icons[name] ?? '';
  }

  copied = false;
  copyId(): void {
    if (!this.successPatient) return;
    navigator.clipboard.writeText(this.successPatient.id).then(() => {
      this.copied = true;
      setTimeout(() => this.copied = false, 2000);
    });
  }
}
