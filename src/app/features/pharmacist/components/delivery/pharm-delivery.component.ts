import { Component, OnInit, OnDestroy } from "@angular/core";
import { PharmacistDataService, DigitalPrescription } from "../../../../core/services/pharmacist-data.service";
import { SoundService } from "../../../../core/services/sound.service";
import { Subscription } from "rxjs";

@Component({
  selector: "app-pharm-delivery",
  templateUrl: "./pharm-delivery.component.html",
  styleUrls: ["./pharm-delivery.component.scss"]
})
export class PharmDeliveryComponent implements OnInit, OnDestroy {
  searchId = "";
  prescription: DigitalPrescription | null = null;
  loading = false;
  notFound = false;
  delivering = false;
  deliveredSuccess = false;
  private sub!: Subscription;

  constructor(private pharmData: PharmacistDataService, private sound: SoundService) {}

  ngOnInit(): void {
    this.sub = this.pharmData.paymentConfirmed$.subscribe(patientId => {
      if (this.prescription?.patientId === patientId) {
        this.prescription.billStatus = "paid";
        this.prescription.paidAt = new Date().toLocaleString();
        this.sound.playNotification();
      }
    });
  }

  ngOnDestroy(): void { this.sub?.unsubscribe(); }

  lookup(): void {
    if (!this.searchId.trim()) return;
    this.loading = true;
    this.notFound = false;
    this.prescription = null;
    this.deliveredSuccess = false;
    this.pharmData.getPrescriptionByPatientId(this.searchId.trim().toUpperCase()).subscribe(rx => {
      this.loading = false;
      if (rx) { this.prescription = rx; } else { this.notFound = true; }
    });
  }

  deliver(): void {
    if (!this.prescription || this.prescription.billStatus !== "paid" || this.prescription.delivered) return;
    this.delivering = true;
    this.pharmData.markDelivered(this.prescription.visitId).subscribe(() => {
      this.prescription!.delivered = true;
      this.prescription!.deliveredAt = new Date().toLocaleString();
      this.delivering = false;
      this.deliveredSuccess = true;
      this.sound.playNotification();
      // Decrement stock for each item
      this.prescription!.items.forEach(item => {
        const invId = "m" + (Math.floor(Math.random() * 14) + 1);
        this.pharmData.decrementStock(invId, item.qty).subscribe();
      });
    });
  }

  get canDeliver(): boolean {
    return !!this.prescription && this.prescription.billStatus === "paid" && !this.prescription.delivered;
  }

  statusClass(status: string): string {
    return status === "paid" ? "status-paid" : status === "partial" ? "status-partial" : "status-pending";
  }
}
