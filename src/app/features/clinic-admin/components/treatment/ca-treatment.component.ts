import { Component, OnInit } from '@angular/core';
import { ClinicAdminDataService, TreatmentRate, XrayRate } from '../../../../core/services/clinic-admin-data.service';
import { ClinicSettingsService } from '../../../../core/services/clinic-settings.service';

@Component({
  selector: 'app-ca-treatment',
  templateUrl: './ca-treatment.component.html',
  styleUrls: ['./ca-treatment.component.scss']
})
export class CaTreatmentComponent implements OnInit {
  treatments: TreatmentRate[] = [];
  xrays: XrayRate[] = [];
  editingId: string | null = null;
  editPrice = 0;
  consultFee = 300;
  saving = false;

  constructor(private data: ClinicAdminDataService, private clinicSettings: ClinicSettingsService) {}

  ngOnInit(): void {
    this.data.getTreatments().subscribe(t => this.treatments = t);
    this.data.getXrays().subscribe(x => this.xrays = x);
    this.consultFee = this.clinicSettings.consultationFee;
  }

  startEdit(id: string, price: number): void { this.editingId = id; this.editPrice = price; }
  cancelEdit(): void { this.editingId = null; }

  saveTreatment(id: string): void {
    this.saving = true;
    this.data.updateTreatmentPrice(id, this.editPrice).subscribe(() => {
      const t = this.treatments.find(x => x.id === id);
      if (t) t.price = this.editPrice;
      this.saving = false; this.editingId = null;
    });
  }

  saveXray(id: string): void {
    this.saving = true;
    this.data.updateXrayPrice(id, this.editPrice).subscribe(() => {
      const x = this.xrays.find(r => r.id === id);
      if (x) x.price = this.editPrice;
      this.saving = false; this.editingId = null;
    });
  }

  saveConsultFee(): void { this.clinicSettings.setConsultationFee(this.consultFee); }
}
