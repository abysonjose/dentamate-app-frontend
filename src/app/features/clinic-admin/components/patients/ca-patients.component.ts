import { Component, OnInit } from '@angular/core';
import { ClinicAdminDataService, PatientRecord } from '../../../../core/services/clinic-admin-data.service';

@Component({
  selector: 'app-ca-patients',
  templateUrl: './ca-patients.component.html',
  styleUrls: ['./ca-patients.component.scss']
})
export class CaPatientsComponent implements OnInit {
  patients: PatientRecord[] = [];
  filtered: PatientRecord[] = [];
  searchQuery = '';
  filterStatus = 'all';

  constructor(private data: ClinicAdminDataService) {}

  ngOnInit(): void {
    this.data.getPatients().subscribe(p => { this.patients = p; this.applyFilter(); });
  }

  applyFilter(): void {
    this.filtered = this.patients.filter(p => {
      const matchSearch = p.name.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
                          p.id.toLowerCase().includes(this.searchQuery.toLowerCase());
      const matchStatus = this.filterStatus === 'all' || p.status === this.filterStatus;
      return matchSearch && matchStatus;
    });
  }

  toggleStatus(p: PatientRecord): void {
    const newStatus = p.status === 'active' ? 'suspended' : 'active';
    this.data.updatePatientStatus(p.id, newStatus).subscribe(() => p.status = newStatus);
  }

  initials(name: string): string { return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase(); }
  age(dob: string): number { return new Date().getFullYear() - new Date(dob).getFullYear(); }
}
