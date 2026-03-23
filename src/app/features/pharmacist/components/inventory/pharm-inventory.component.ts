import { Component, OnInit } from "@angular/core";
import { PharmacistDataService, PharmacyInventoryItem } from "../../../../core/services/pharmacist-data.service";
import { SoundService } from "../../../../core/services/sound.service";

@Component({
  selector: "app-pharm-inventory",
  templateUrl: "./pharm-inventory.component.html",
  styleUrls: ["./pharm-inventory.component.scss"]
})
export class PharmInventoryComponent implements OnInit {
  inventory: PharmacyInventoryItem[] = [];
  loading = true;
  refillSent: string | null = null;
  searchTerm = "";

  constructor(private pharmData: PharmacistDataService, private sound: SoundService) {}

  ngOnInit(): void {
    this.pharmData.getInventory().subscribe(inv => { this.inventory = inv; this.loading = false; });
  }

  get filtered(): PharmacyInventoryItem[] {
    const q = this.searchTerm.toLowerCase();
    return this.inventory.filter(i =>
      i.name.toLowerCase().includes(q) || i.category.toLowerCase().includes(q) || i.form.toLowerCase().includes(q)
    );
  }

  get criticalItems(): PharmacyInventoryItem[] {
    return this.inventory.filter(i => i.stock <= i.minStock);
  }

  stockLevel(item: PharmacyInventoryItem): "critical" | "low" | "ok" {
    if (item.stock === 0) return "critical";
    if (item.stock <= item.minStock) return "low";
    return "ok";
  }

  stockPct(item: PharmacyInventoryItem): number {
    const max = item.minStock * 5;
    return Math.min(100, Math.round((item.stock / max) * 100));
  }

  sendRefill(item: PharmacyInventoryItem): void {
    this.pharmData.sendRefillRequest(item.id).subscribe(() => {
      this.refillSent = item.id;
      this.sound.playNotification();
      setTimeout(() => this.refillSent = null, 3000);
    });
  }
}
