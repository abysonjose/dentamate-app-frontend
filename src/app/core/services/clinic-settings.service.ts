import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ClinicSettingsService {
  // Single clinic-wide consultation fee set by admin
  private _consultationFee = new BehaviorSubject<number>(300);
  consultationFee$ = this._consultationFee.asObservable();

  get consultationFee(): number {
    return this._consultationFee.getValue();
  }

  setConsultationFee(fee: number): void {
    this._consultationFee.next(fee);
  }
}
