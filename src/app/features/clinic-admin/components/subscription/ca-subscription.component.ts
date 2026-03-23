import { Component, OnInit } from '@angular/core';
import { ClinicAdminDataService } from '../../../../core/services/clinic-admin-data.service';

@Component({
  selector: 'app-ca-subscription',
  templateUrl: './ca-subscription.component.html',
  styleUrls: ['./ca-subscription.component.scss']
})
export class CaSubscriptionComponent implements OnInit {
  sub: any = null;
  constructor(private data: ClinicAdminDataService) {}
  ngOnInit(): void { this.data.getSubscription().subscribe(s => this.sub = s); }
  get userPct(): number { return this.sub ? Math.round((this.sub.usersUsed / this.sub.usersLimit) * 100) : 0; }
  get aiPct():   number { return this.sub ? Math.round((this.sub.aiCreditsUsed / this.sub.aiCreditsLimit) * 100) : 0; }
  daysLeft(expiry: string): number {
    return Math.max(0, Math.ceil((new Date(expiry).getTime() - Date.now()) / 86400000));
  }
}
