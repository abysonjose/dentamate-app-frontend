import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { SaasAdminDataService, ClinicRecord, SubscriptionPlan } from '../../../../core/services/saas-admin-data.service';
import { SoundService } from '../../../../core/services/sound.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-sa-clinics',
  templateUrl: './sa-clinics.component.html',
  styleUrls: ['./sa-clinics.component.scss']
})
export class SaClinicsComponent implements OnInit, OnDestroy {
  clinics: ClinicRecord[] = [];
  filtered: ClinicRecord[] = [];
  searchTerm = '';
  filterStatus = 'all';
  selectedClinic: ClinicRecord | null = null;
  showModuleModal = false;
  moduleClinic: ClinicRecord | null = null;
  modulesCopy: Record<string, boolean> = {};
  blockAllConfirm = false;
  showMaintenanceModal = false;
  maintenanceClinic: ClinicRecord | null = null;
  maintenanceDate = '';
  maintenanceTime = '';
  maintenanceMsg = '';
  maintenanceSent = false;

  // Register Clinic
  showRegisterModal = false;
  registerForm!: FormGroup;
  plans: SubscriptionPlan[] = [];
  isRegistering = false;
  registerSuccess = false;
  showRegisterPassword = false;

  private subs: Subscription[] = [];

  moduleKeys = ['lab', 'pharmacy', 'ai', 'chat'];
  moduleLabels: Record<string, string> = { lab: 'Lab Manager', pharmacy: 'Pharmacy', ai: 'AI Services', chat: 'Staff Chat' };

  constructor(private data: SaasAdminDataService, private sound: SoundService, private fb: FormBuilder) {}

  ngOnInit(): void {
    this.subs.push(this.data.getClinics().subscribe(c => { this.clinics = c; this.applyFilter(); }));
    this.subs.push(this.data.getPlans().subscribe(p => this.plans = p));
    this.registerForm = this.fb.group({
      clinicName:  ['', [Validators.required, Validators.minLength(2)]],
      ownerName:   ['', [Validators.required, Validators.minLength(2)]],
      email:       ['', [Validators.required, Validators.email]],
      phone:       ['', [Validators.required, Validators.pattern(/^[6-9]\d{9}$/)]],
      address:     ['', [Validators.required, Validators.minLength(5)]],
      plan:        ['', Validators.required],
      password:    ['', [Validators.required, Validators.minLength(8)]],
    });
  }

  applyFilter(): void {
    this.filtered = this.clinics.filter(c => {
      const matchSearch = !this.searchTerm || c.name.toLowerCase().includes(this.searchTerm.toLowerCase()) || c.owner.toLowerCase().includes(this.searchTerm.toLowerCase());
      const matchStatus = this.filterStatus === 'all' || c.status === this.filterStatus;
      return matchSearch && matchStatus;
    });
  }

  setStatus(clinic: ClinicRecord, status: 'active' | 'suspended' | 'blocked'): void {
    this.data.updateClinicStatus(clinic.id, status).subscribe(() => {
      clinic.status = status;
      this.sound.playSuccess();
    });
  }

  openModules(clinic: ClinicRecord): void {
    this.moduleClinic = clinic;
    this.modulesCopy = { ...clinic.modules };
    this.showModuleModal = true;
    this.sound.playClick();
  }

  saveModules(): void {
    if (!this.moduleClinic) return;
    this.data.updateClinicModules(this.moduleClinic.id, this.modulesCopy).subscribe(() => {
      if (this.moduleClinic) this.moduleClinic.modules = { ...this.modulesCopy };
      this.showModuleModal = false;
      this.sound.playSuccess();
    });
  }

  openMaintenance(clinic: ClinicRecord | null): void {
    this.maintenanceClinic = clinic;
    this.maintenanceDate = '';
    this.maintenanceTime = '';
    this.maintenanceMsg = '';
    this.maintenanceSent = false;
    this.showMaintenanceModal = true;
    this.sound.playClick();
  }

  sendMaintenance(): void {
    if (!this.maintenanceDate || !this.maintenanceTime || !this.maintenanceMsg.trim()) return;
    const scheduledAt = `${this.maintenanceDate} ${this.maintenanceTime}`;
    const clinicId = this.maintenanceClinic ? this.maintenanceClinic.id : 'all';
    this.data.sendMaintenanceNotification(clinicId, scheduledAt, this.maintenanceMsg.trim()).subscribe(() => {
      this.maintenanceSent = true;
      this.sound.playSuccess();
      setTimeout(() => { this.showMaintenanceModal = false; }, 1500);
    });
  }

  blockAll(): void {
    this.data.blockAllClinics().subscribe(() => {
      this.clinics.forEach(c => { if (c.status === 'active') c.status = 'blocked'; });
      this.applyFilter();
      this.blockAllConfirm = false;
      this.sound.playError();
    });
  }

  getStatusColor(status: string): string {
    return status === 'active' ? '#22c55e' : status === 'suspended' ? '#f59e0b' : '#ef4444';
  }

  getPlanColor(plan: string): string {
    const map: Record<string, string> = { Starter: '#64748b', Basic: '#3b82f6', Pro: '#14b8a6', Enterprise: '#a855f7' };
    return map[plan] ?? '#64748b';
  }

  openRegisterModal(): void {
    this.registerForm.reset();
    this.registerSuccess = false;
    this.isRegistering = false;
    this.showRegisterModal = true;
    this.sound.playClick();
  }

  get rf() { return this.registerForm.controls; }

  submitRegister(): void {
    if (this.registerForm.invalid) { this.registerForm.markAllAsTouched(); return; }
    this.isRegistering = true;
    const v = this.registerForm.value;
    this.data.createClinic({
      name: v.clinicName, owner: v.ownerName, email: v.email,
      phone: v.phone, location: v.address, plan: v.plan, password: v.password,
    } as any).subscribe({
      next: () => {
        this.isRegistering = false;
        this.registerSuccess = true;
        this.sound.playSuccess();
        this.data.getClinics().subscribe(c => { this.clinics = c; this.applyFilter(); });
        setTimeout(() => { this.showRegisterModal = false; }, 1800);
      },
      error: () => { this.isRegistering = false; this.sound.playError(); }
    });
  }

  ngOnDestroy(): void { this.subs.forEach(s => s.unsubscribe()); }
}
