import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subject, Subscription, debounceTime, distinctUntilChanged, switchMap } from 'rxjs';
import { ReceptionistDataService, PatientLookup } from '../../../../core/services/receptionist-data.service';
import { QueueService, RfidResultEvent } from '../../../../core/services/queue.service';
import { AuthService } from '../../../../core/services/auth.service';

export interface IssuedCard {
  patientId: string;
  issuedOn: string;
  issuedBy: string;
  rfidUid: string;
}

@Component({
  selector: 'app-rec-patient-lookup',
  templateUrl: './patient-lookup.component.html',
  styleUrls: ['./patient-lookup.component.scss']
})
export class PatientLookupComponent implements OnInit, OnDestroy {
  query = '';
  results: PatientLookup[] = [];
  loading = false;
  searched = false;
  selected: PatientLookup | null = null;
  private search$ = new Subject<string>();
  private subs: Subscription[] = [];

  // Card issue state
  issuedCards: Record<string, IssuedCard> = {};
  showCardModal = false;
  issuing = false;
  issueCopied = false;

  // RFID state
  rfidActive = false;       // reader is waiting for a scan
  rfidMessage = '';
  rfidSuccess: boolean | null = null;
  rfidTimeout: any;

  constructor(
    private data: ReceptionistDataService,
    private queueSvc: QueueService,
    private auth: AuthService,
  ) {
    this.search$.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      switchMap(q => { this.loading = true; return this.data.searchPatients(q); })
    ).subscribe(r => { this.results = r; this.loading = false; this.searched = true; });
  }

  ngOnInit(): void {
    // Connect socket if not already connected
    this.queueSvc.connect(this.auth.clinicId, this.auth.userId, this.auth.role);

    // Listen for RFID mode changes (idle = scan done or cancelled)
    this.subs.push(
      this.queueSvc.rfidMode$.subscribe(ev => {
        if (ev.mode === 'idle') {
          this.rfidActive = false;
          clearTimeout(this.rfidTimeout);
        }
      })
    );

    // Listen for RFID scan results
    this.subs.push(
      this.queueSvc.rfidResult$.subscribe((ev: RfidResultEvent) => {
        this.rfidActive = false;
        this.rfidSuccess = ev.success;
        this.rfidMessage = ev.message;

        if (ev.success && ev.mode === 'assign' && ev.uid && this.selected) {
          this.issuedCards[this.selected.id] = {
            patientId: this.selected.id,
            issuedOn: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }),
            issuedBy: `${this.auth.currentUser?.userId} · ${this.auth.currentUser?.publicName}`,
            rfidUid: ev.uid,
          };
          this.showCardModal = true;
        }

        // Auto-clear message after 5s
        setTimeout(() => { this.rfidSuccess = null; this.rfidMessage = ''; }, 5000);
      })
    );

    // Load existing card for selected patient when selection changes
  }

  ngOnDestroy(): void {
    this.subs.forEach(s => s.unsubscribe());
    clearTimeout(this.rfidTimeout);
  }

  onSearch(): void {
    if (this.query.trim().length < 2) { this.results = []; this.searched = false; return; }
    this.search$.next(this.query.trim());
  }

  selectPatient(p: PatientLookup): void {
    this.selected = p;
    this.showCardModal = false;
    this.rfidActive = false;
    this.rfidMessage = '';
    this.rfidSuccess = null;

    // Check if patient already has a card from backend
    this.queueSvc.getPatientCard(p.id).subscribe(res => {
      if (res.hasCard && res.rfidUid) {
        this.issuedCards[p.id] = {
          patientId: p.id,
          issuedOn: '—',
          issuedBy: '—',
          rfidUid: res.rfidUid,
        };
      }
    });
  }

  closeDetail(): void {
    this.selected = null;
    this.showCardModal = false;
    this.cancelRfid();
  }

  get selectedCard(): IssuedCard | null {
    return this.selected ? (this.issuedCards[this.selected.id] ?? null) : null;
  }

  issueCard(): void {
    if (!this.selected) return;
    this.issuing = true;
    this.rfidMessage = '';
    this.rfidSuccess = null;

    this.queueSvc.startRfidAssignment(this.selected.id).subscribe({
      next: () => {
        this.issuing = false;
        this.rfidActive = true;
        this.rfidMessage = 'Scan the RFID card now...';

        // Auto-cancel after 60s
        this.rfidTimeout = setTimeout(() => {
          if (this.rfidActive) {
            this.rfidActive = false;
            this.rfidMessage = 'Timed out. Please try again.';
            this.rfidSuccess = false;
          }
        }, 60000);
      },
      error: (err) => {
        this.issuing = false;
        this.rfidMessage = err?.error?.message || 'Failed to activate RFID reader';
        this.rfidSuccess = false;
      }
    });
  }

  cancelRfid(): void {
    if (!this.rfidActive) return;
    this.rfidActive = false;
    clearTimeout(this.rfidTimeout);
    this.queueSvc.cancelRfidAssignment().subscribe();
    this.rfidMessage = '';
  }

  viewCard(): void { this.showCardModal = true; }
  closeModal(): void { this.showCardModal = false; }

  copyCardNumber(): void {
    if (!this.selectedCard) return;
    navigator.clipboard.writeText(this.selectedCard.rfidUid).then(() => {
      this.issueCopied = true;
      setTimeout(() => this.issueCopied = false, 2000);
    });
  }

  initials(name: string): string {
    return name.split(' ').filter(w => w.length > 0).slice(0, 2).map(w => w[0]).join('').toUpperCase();
  }
}
