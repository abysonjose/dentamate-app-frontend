import { Component, OnInit } from '@angular/core';
import { ClinicAdminDataService, StaffMember } from '../../../../core/services/clinic-admin-data.service';

@Component({
  selector: 'app-ca-staff',
  templateUrl: './ca-staff.component.html',
  styleUrls: ['./ca-staff.component.scss']
})
export class CaStaffComponent implements OnInit {
  staff: StaffMember[] = [];
  filtered: StaffMember[] = [];
  searchQuery = '';
  filterRole = 'all';
  showAddModal = false;
  loading = false;

  newStaff: Partial<StaffMember> = {};
  roles = ['Doctor', 'Receptionist', 'Cashier', 'Lab Manager', 'Pharmacist'];
  branches = ['Main Branch', 'North Branch', 'East Branch'];
  departments = ['General Dentistry', 'Orthodontics', 'Endodontics', 'Periodontics', 'Oral Surgery', 'Pediatric Dentistry', 'Prosthodontics'];

  get isDoctor(): boolean { return this.newStaff.role === 'Doctor'; }

  onRoleChange(): void {
    if (this.newStaff.role === 'Doctor') {
      const name = this.newStaff.name?.trim() ?? '';
      if (name && !name.startsWith('Dr. ')) {
        this.newStaff.name = 'Dr. ' + name;
      } else if (!name) {
        this.newStaff.name = 'Dr. ';
      }
      if (!this.newStaff.department) {
        this.newStaff.department = this.departments[0];
      }
    } else {
      if (this.newStaff.name?.startsWith('Dr. ')) {
        this.newStaff.name = this.newStaff.name.slice(4);
      }
      this.newStaff.department = undefined;
    }
  }

  constructor(private data: ClinicAdminDataService) {}

  ngOnInit(): void {
    this.data.getStaff().subscribe(s => { this.staff = s; this.applyFilter(); });
  }

  applyFilter(): void {
    this.filtered = this.staff.filter(s => {
      const matchSearch = s.name.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
                          s.id.toLowerCase().includes(this.searchQuery.toLowerCase());
      const matchRole = this.filterRole === 'all' || s.role === this.filterRole;
      return matchSearch && matchRole;
    });
  }

  toggleStatus(member: StaffMember): void {
    const newStatus = member.status === 'active' ? 'suspended' : 'active';
    this.data.updateStaffStatus(member.id, newStatus).subscribe(() => {
      member.status = newStatus;
    });
  }

  openAdd(): void { this.newStaff = { status: 'active', online: false, branch: 'Main Branch', role: 'Doctor', joinDate: new Date().toISOString().split('T')[0] }; this.showAddModal = true; }
  closeAdd(): void { this.showAddModal = false; }

  saveStaff(): void {
    if (!this.newStaff.name || !this.newStaff.email) return;
    this.loading = true;
    this.data.addStaff(this.newStaff as Omit<StaffMember, 'id'>).subscribe(s => {
      this.staff.push(s); this.applyFilter(); this.loading = false; this.showAddModal = false;
    });
  }

  get uniqueRoles(): string[] { return ['all', ...this.roles]; }
  initials(name: string): string { return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase(); }
}
