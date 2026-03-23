import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { SaasAdminDataService, SubscriptionPlan } from '../../core/services/saas-admin-data.service';

@Component({
  selector: 'app-clinic-register',
  templateUrl: './clinic-register.component.html',
  styleUrls: ['./clinic-register.component.scss']
})
export class ClinicRegisterComponent implements OnInit {
  plans: SubscriptionPlan[] = [];
  selectedPlan: SubscriptionPlan | null = null;

  featureList = [
    { title: 'Smart Appointments', desc: 'Manage bookings, reminders, and live queue with real-time updates.', icon: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>', bg: 'rgba(20,184,166,0.12)' },
    { title: 'AI Diagnostics', desc: 'X-ray analysis and treatment suggestions powered by deep learning.', icon: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/></svg>', bg: 'rgba(168,85,247,0.12)' },
    { title: 'Billing & Cashier', desc: 'Automated invoicing, GST billing, and payment tracking in one place.', icon: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>', bg: 'rgba(59,130,246,0.12)' },
    { title: 'Lab Management', desc: 'Track lab orders, reports, and turnaround times seamlessly.', icon: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v18m0 0h10a2 2 0 0 0 2-2V9M9 21H5a2 2 0 0 1-2-2V9m0 0h18"/></svg>', bg: 'rgba(234,179,8,0.12)' },
    { title: 'Pharmacy Module', desc: 'Inventory control, prescription management, and delivery tracking.', icon: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>', bg: 'rgba(16,185,129,0.12)' },
    { title: 'Staff Chat', desc: 'Real-time internal messaging across all roles and departments.', icon: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>', bg: 'rgba(239,68,68,0.12)' },
  ];
  showRegisterForm = false;
  registrationSuccess = false;
  isSubmitting = false;
  showPassword = false;
  showConfirmPassword = false;
  registerForm!: FormGroup;

  constructor(
    private fb: FormBuilder,
    private saasData: SaasAdminDataService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.saasData.getPlans().subscribe(p => this.plans = p);
    this.registerForm = this.fb.group({
      clinicName:   ['', [Validators.required, Validators.minLength(2)]],
      ownerName:    ['', [Validators.required, Validators.minLength(2)]],
      email:        ['', [Validators.required, Validators.email]],
      phone:        ['', [Validators.required, Validators.pattern(/^[6-9]\d{9}$/)]],
      address:      ['', [Validators.required, Validators.minLength(10)]],
      gstNumber:    ['', [Validators.required, Validators.pattern(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/)]],
      panNumber:    ['', [Validators.required, Validators.pattern(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/)]],
      password:     ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', Validators.required],
    }, { validators: this.passwordMatchValidator });
  }

  passwordMatchValidator(g: FormGroup) {
    const pw = g.get('password')?.value;
    const cpw = g.get('confirmPassword')?.value;
    return pw === cpw ? null : { mismatch: true };
  }

  selectPlan(plan: SubscriptionPlan): void {
    this.selectedPlan = plan;
    this.showRegisterForm = true;
    setTimeout(() => {
      document.getElementById('register-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  }

  get f() { return this.registerForm.controls; }

  onSubmit(): void {
    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched();
      return;
    }
    this.isSubmitting = true;
    // Simulate API call
    setTimeout(() => {
      this.isSubmitting = false;
      this.registrationSuccess = true;
    }, 1800);
  }

  goToLogin(): void {
    this.router.navigate(['/login']);
  }

  scrollToPlans(): void {
    document.getElementById('plans-section')?.scrollIntoView({ behavior: 'smooth' });
  }
}
