import { Component, OnInit } from '@angular/core';
import { ClinicAdminDataService, SystemLog } from '../../../../core/services/clinic-admin-data.service';

@Component({
  selector: 'app-ca-logs',
  templateUrl: './ca-logs.component.html',
  styleUrls: ['./ca-logs.component.scss']
})
export class CaLogsComponent implements OnInit {
  logs: SystemLog[] = [];
  filtered: SystemLog[] = [];
  searchQuery = '';
  filterAction = 'all';

  constructor(private data: ClinicAdminDataService) {}

  ngOnInit(): void { this.data.getLogs().subscribe(l => { this.logs = l; this.applyFilter(); }); }

  applyFilter(): void {
    this.filtered = this.logs.filter(l => {
      const matchSearch = l.userName.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
                          l.userId.toLowerCase().includes(this.searchQuery.toLowerCase());
      const matchAction = this.filterAction === 'all' || l.action === this.filterAction;
      return matchSearch && matchAction;
    });
  }

  actionColor(action: string): string {
    return action === 'login' || action === 'sign-in' ? 'green' : 'red';
  }
}
