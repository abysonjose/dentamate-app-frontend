import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { Router } from '@angular/router';

export interface AuthUser {
  _id: string;
  userId: string;
  publicName: string;
  email: string;
  role: string;
  clinic: { _id: string; name: string; status: string } | null;
}

@Injectable({ providedIn: 'root' })
export class AuthService {

  private readonly API = 'http://localhost:5000/api/auth';
  private readonly TOKEN_KEY = 'dm_token';
  private readonly USER_KEY  = 'dm_user';

  private _user$ = new BehaviorSubject<AuthUser | null>(this._loadUser());
  user$ = this._user$.asObservable();

  constructor(private http: HttpClient, private router: Router) {}

  // ── Login ─────────────────────────────────────────────────────────────────

  login(email: string, password: string): Observable<{ success: boolean; token: string; user: AuthUser }> {
    return this.http.post<any>(`${this.API}/login`, { email, password }).pipe(
      tap(res => {
        localStorage.setItem(this.TOKEN_KEY, res.token);
        localStorage.setItem(this.USER_KEY, JSON.stringify(res.user));
        this._user$.next(res.user);
      })
    );
  }

  logout(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
    this._user$.next(null);
    this.router.navigate(['/login']);
  }

  // ── Getters ───────────────────────────────────────────────────────────────

  get token(): string {
    return localStorage.getItem(this.TOKEN_KEY) || '';
  }

  get currentUser(): AuthUser | null {
    return this._user$.value;
  }

  get clinicId(): string {
    return this._user$.value?.clinic?._id || '';
  }

  get userId(): string {
    return this._user$.value?._id || '';
  }

  get role(): string {
    return this._user$.value?.role || '';
  }

  isLoggedIn(): boolean {
    return !!this.token && !!this._user$.value;
  }

  // ── OTP ───────────────────────────────────────────────────────────────────

  sendOtp(email: string): Observable<any> {
    return this.http.post(`${this.API}/send-otp`, { email });
  }

  verifyOtp(email: string, otp: string, newPassword?: string): Observable<any> {
    return this.http.post(`${this.API}/verify-otp`, { email, otp, newPassword });
  }

  // ── Private ───────────────────────────────────────────────────────────────

  private _loadUser(): AuthUser | null {
    try {
      const raw = localStorage.getItem(this.USER_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }
}
