import { Component, OnInit, OnDestroy } from '@angular/core';
import { SaasAdminDataService, SubscriptionPlan } from '../../../../core/services/saas-admin-data.service';
import { SoundService } from '../../../../core/services/sound.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-sa-plans',
  templateUrl: './sa-plans.component.html',
  styleUrls: ['./sa-plans.component.scss']
})
export class SaPlansComponent implements OnInit, OnDestroy {
  plans: SubscriptionPlan[] = [];
  showModal = false;
  deleteConfirmId: string | null = null;
  saving = false;
  private subs: Subscription[] = [];

  editPlan: SubscriptionPlan = this.emptyPlan();

  constructor(private data: SaasAdminDataService, private sound: SoundService) {}

  ngOnInit(): void {
    this.subs.push(this.data.getPlans().subscribe(p => this.plans = p));
  }

  emptyPlan(): SubscriptionPlan {
    return { id: '', name: '', price: 0, billingCycle: 'monthly', users: 10, aiCredits: 500, branches: 1, features: [], clinicCount: 0, color: '#14b8a6' };
  }

  openAdd(): void {
    this.editPlan = this.emptyPlan();
    this.showModal = true;
    this.sound.playClick();
  }

  openEdit(plan: SubscriptionPlan): void {
    this.editPlan = { ...plan, features: [...plan.features] };
    this.showModal = true;
    this.sound.playClick();
  }

  closeModal(): void { this.showModal = false; }

  addFeature(): void { this.editPlan.features.push(''); }
  removeFeature(i: number): void { this.editPlan.features.splice(i, 1); }
  trackByIdx(i: number): number { return i; }

  save(): void {
    if (!this.editPlan.name.trim()) return;
    this.saving = true;
    this.data.savePlan(this.editPlan).subscribe(() => {
      this.data.getPlans().subscribe(p => this.plans = p);
      this.saving = false;
      this.showModal = false;
      this.sound.playSuccess();
    });
  }

  confirmDelete(id: string): void { this.deleteConfirmId = id; this.sound.playClick(); }

  doDelete(): void {
    if (!this.deleteConfirmId) return;
    this.data.deletePlan(this.deleteConfirmId).subscribe(() => {
      this.plans = this.plans.filter(p => p.id !== this.deleteConfirmId);
      this.deleteConfirmId = null;
      this.sound.playSuccess();
    });
  }

  ngOnDestroy(): void { this.subs.forEach(s => s.unsubscribe()); }
}
