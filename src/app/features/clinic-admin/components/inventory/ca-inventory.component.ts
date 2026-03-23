import { Component, OnInit } from '@angular/core';
import { ClinicAdminDataService, InventoryItem } from '../../../../core/services/clinic-admin-data.service';

@Component({
  selector: 'app-ca-inventory',
  templateUrl: './ca-inventory.component.html',
  styleUrls: ['./ca-inventory.component.scss']
})
export class CaInventoryComponent implements OnInit {
  inventory: InventoryItem[] = [];
  filtered: InventoryItem[] = [];
  searchQuery = '';
  refillItem: InventoryItem | null = null;
  refillQty = 0;
  refillPrice = 0;
  saving = false;

  constructor(private data: ClinicAdminDataService) {}

  ngOnInit(): void {
    this.data.getInventory().subscribe(inv => { this.inventory = inv; this.applyFilter(); });
  }

  applyFilter(): void {
    this.filtered = this.inventory.filter(i =>
      i.name.toLowerCase().includes(this.searchQuery.toLowerCase())
    );
  }

  stockLevel(item: InventoryItem): 'ok' | 'low' | 'critical' {
    if (item.stock === 0) return 'critical';
    if (item.stock <= item.minStock) return 'low';
    return 'ok';
  }

  stockPct(item: InventoryItem): number {
    const max = item.minStock * 5;
    return Math.min(100, Math.round((item.stock / max) * 100));
  }

  openRefill(item: InventoryItem): void {
    this.refillItem = item; this.refillQty = item.minStock * 2; this.refillPrice = item.unitPrice;
  }

  saveRefill(): void {
    if (!this.refillItem || this.refillQty <= 0) return;
    this.saving = true;
    this.data.refillInventory(this.refillItem.id, this.refillQty, this.refillPrice).subscribe(() => {
      this.saving = false; this.refillItem = null;
    });
  }

  get refillRequests(): InventoryItem[] { return this.inventory.filter(i => i.refillRequested); }
}
