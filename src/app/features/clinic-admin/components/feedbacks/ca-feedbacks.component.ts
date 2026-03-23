import { Component, OnInit } from '@angular/core';
import { ClinicAdminDataService, Feedback } from '../../../../core/services/clinic-admin-data.service';

@Component({
  selector: 'app-ca-feedbacks',
  templateUrl: './ca-feedbacks.component.html',
  styleUrls: ['./ca-feedbacks.component.scss']
})
export class CaFeedbacksComponent implements OnInit {
  feedbacks: Feedback[] = [];
  constructor(private data: ClinicAdminDataService) {}
  ngOnInit(): void { this.data.getFeedbacks().subscribe(f => this.feedbacks = f); }
  stars(score: number): number[] { return Array.from({ length: 5 }, (_, i) => i + 1); }
  avgScore(f: Feedback): number {
    return Math.round(((f.treatmentScore + f.doctorScore + f.facilityScore + f.overallScore) / 4) * 10) / 10;
  }
}
