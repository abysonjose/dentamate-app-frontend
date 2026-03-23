import { Injectable, OnDestroy } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { BehaviorSubject, Observable, Subject } from 'rxjs';
import { tap } from 'rxjs/operators';
import { io, Socket } from 'socket.io-client';

// ── Interfaces (aligned with backend TokenQueue.model.js) ─────────────────────

export interface TokenEntry {
  _id?: string;
  tokenNumber: number;
  patient: string | { _id: string; publicName: string; phone: string };
  patientName: string;
  doctor?: string | { _id: string; publicName: string };
  appointmentId?: string;
  status: 'waiting' | 'arrived' | 'in_progress' | 'completed' | 'skipped' | 'cancelled';
  calledAt?: string;
  completedAt?: string;
  isWalkIn: boolean;
}

export interface TokenQueue {
  _id: string;
  clinic: string;
  date: string;
  nextTokenNumber: number;
  currentToken: number;
  tokens: TokenEntry[];
}

export interface QueueBroadcast {
  currentToken: number;
  totalWaiting: number;
  tokens: TokenEntry[];
  timestamp: string;
}

export interface TokenCalledEvent {
  tokenNumber: number;
  patientName: string;
  timestamp: string;
}

export interface RfidModeEvent {
  mode: 'assign' | 'idle';
  patientId?: string;
  patientName?: string;
}

export interface RfidResultEvent {
  success: boolean;
  mode: 'assign' | 'arrival';
  patientId?: string;
  patientName?: string;
  tokenNumber?: number;
  uid?: string;
  message: string;
}

// ── Service ───────────────────────────────────────────────────────────────────

@Injectable({ providedIn: 'root' })
export class QueueService implements OnDestroy {

  private readonly API = 'http://localhost:5000/api/queue';
  private readonly RFID_API = 'http://localhost:5000/api/rfid';
  private readonly SOCKET_URL = 'http://localhost:5000';

  private socket!: Socket;

  // ── Reactive state ────────────────────────────────────────────────────────
  private _queue$ = new BehaviorSubject<TokenQueue | null>(null);
  queue$ = this._queue$.asObservable();

  // Emits every time the server broadcasts a queue update
  private _queueUpdate$ = new Subject<QueueBroadcast>();
  queueUpdate$ = this._queueUpdate$.asObservable();

  // Emits when a doctor calls a specific token (for patient waiting room display)
  private _tokenCalled$ = new Subject<TokenCalledEvent>();
  tokenCalled$ = this._tokenCalled$.asObservable();

  // Emits the patientId/tokenNumber that just got RFID-scanned / added
  private _queuePulse$ = new Subject<number>();
  queuePulse$ = this._queuePulse$.asObservable();

  // RFID events
  private _rfidMode$ = new Subject<RfidModeEvent>();
  rfidMode$ = this._rfidMode$.asObservable();

  private _rfidResult$ = new Subject<RfidResultEvent>();
  rfidResult$ = this._rfidResult$.asObservable();

  constructor(private http: HttpClient) {}

  // ── Socket.io Connection ──────────────────────────────────────────────────

  /**
   * Connect to the backend Socket.io server and join the clinic room.
   * Call this once after login, passing the clinicId and user info from JWT.
   */
  connect(clinicId: string, userId: string, role: string): void {
    if (this.socket?.connected) return;

    const token = localStorage.getItem('dm_token') || '';

    this.socket = io(this.SOCKET_URL, {
      auth: { token },
      transports: ['websocket'],
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
    });

    this.socket.on('connect', () => {
      console.log('[Socket] Connected:', this.socket.id);
      // Join clinic room + personal room
      this.socket.emit('join_clinic', { clinicId, userId, role });
    });

    // ── Queue events ─────────────────────────────────────────────────────
    this.socket.on('queue_updated', (data: QueueBroadcast) => {
      this._queueUpdate$.next(data);
      // Patch the local queue state with fresh token list
      const current = this._queue$.value;
      if (current) {
        this._queue$.next({
          ...current,
          currentToken: data.currentToken,
          tokens: data.tokens,
        });
      }
    });

    this.socket.on('token_called', (data: TokenCalledEvent) => {
      this._tokenCalled$.next(data);
      this._queuePulse$.next(data.tokenNumber);
    });

    this.socket.on('rfid_mode', (data: RfidModeEvent) => {
      this._rfidMode$.next(data);
    });

    this.socket.on('rfid_result', (data: RfidResultEvent) => {
      this._rfidResult$.next(data);
    });

    this.socket.on('disconnect', (reason: string) => {
      console.warn('[Socket] Disconnected:', reason);
    });

    this.socket.on('connect_error', (err: Error) => {
      console.error('[Socket] Connection error:', err.message);
    });
  }

  disconnect(): void {
    this.socket?.disconnect();
  }

  // ── HTTP API calls ────────────────────────────────────────────────────────

  private get headers(): HttpHeaders {
    const token = localStorage.getItem('dm_token') || '';
    return new HttpHeaders({ Authorization: `Bearer ${token}` });
  }

  /** GET /api/queue/today — load today's queue on dashboard init */
  getTodayQueue(): Observable<{ success: boolean; queue: TokenQueue | null }> {
    return this.http.get<any>(`${this.API}/today`, { headers: this.headers }).pipe(
      tap(res => this._queue$.next(res.queue))
    );
  }

  /**
   * POST /api/queue/add — Receptionist adds a patient (walk-in or appointment)
   */
  addToQueue(payload: {
    patientId: string;
    patientName: string;
    doctorId?: string;
    appointmentId?: string;
    isWalkIn?: boolean;
  }): Observable<{ success: boolean; tokenNumber: number; queue: TokenQueue }> {
    return this.http.post<any>(`${this.API}/add`, payload, { headers: this.headers }).pipe(
      tap(res => {
        this._queue$.next(res.queue);
        this._queuePulse$.next(res.tokenNumber);
      })
    );
  }

  /**
   * POST /api/queue/call-next — Doctor calls the next waiting patient
   */
  callNext(): Observable<{ success: boolean; calledToken: number; patient: string }> {
    return this.http.post<any>(`${this.API}/call-next`, {}, { headers: this.headers }).pipe(
      tap(() => this.getTodayQueue().subscribe())
    );
  }

  /**
   * PATCH /api/queue/token/:tokenNumber/status — update a token's status
   */
  updateTokenStatus(
    tokenNumber: number,
    status: TokenEntry['status']
  ): Observable<{ success: boolean; queue: TokenQueue }> {
    return this.http
      .patch<any>(`${this.API}/token/${tokenNumber}/status`, { status }, { headers: this.headers })
      .pipe(tap(res => this._queue$.next(res.queue)));
  }

  // ── RFID API ──────────────────────────────────────────────────────────────

  /** Activate RFID reader to assign a card to a patient */
  startRfidAssignment(patientId: string): Observable<{ success: boolean; message: string }> {
    return this.http.post<any>(`${this.RFID_API}/assign`, { patientId }, { headers: this.headers });
  }

  /** Cancel pending RFID assignment */
  cancelRfidAssignment(): Observable<{ success: boolean }> {
    return this.http.post<any>(`${this.RFID_API}/cancel-assignment`, {}, { headers: this.headers });
  }

  /** Check if a patient has an RFID card */
  getPatientCard(patientId: string): Observable<{ success: boolean; hasCard: boolean; rfidUid: string | null }> {
    return this.http.get<any>(`${this.RFID_API}/patient-card/${patientId}`, { headers: this.headers });
  }

  // ── Computed helpers ──────────────────────────────────────────────────────

  get currentQueue(): TokenQueue | null {
    return this._queue$.value;
  }

  get waitingCount(): number {
    return this._queue$.value?.tokens.filter(t => t.status === 'waiting').length ?? 0;
  }

  get currentTokenNumber(): number {
    return this._queue$.value?.currentToken ?? 0;
  }

  ngOnDestroy(): void {
    this.disconnect();
  }
}
