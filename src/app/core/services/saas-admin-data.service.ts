import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { BehaviorSubject, Observable, of, delay } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

// ── Interfaces ────────────────────────────────────────────────────────────────

export interface SystemMetric {
  time: string; cpu: number; latency: number; load: number; memory: number;
}

export interface ServerNode {
  id: string; name: string; region: string; status: 'healthy' | 'warning' | 'critical';
  cpu: number; memory: number; load: number;
}

export interface ClinicRecord {
  id: string; name: string; owner: string; email: string; phone: string;
  plan: string; status: 'active' | 'suspended' | 'blocked'; users: number;
  joinDate: string; location: string; aiCreditsUsed: number; aiCreditsLimit: number;
  modules: Record<string, boolean>;
}

export interface SubscriptionPlan {
  id: string; name: string; price: number; billingCycle: 'monthly' | 'yearly';
  users: number; aiCredits: number; branches: number; features: string[];
  clinicCount: number; color: string;
}

export interface RevenuePoint { period: string; amount: number; }
export interface PlanDistribution { plan: string; count: number; color: string; }

export interface FinancialSummary {
  serverCost: number; pendingAmount: number; receivedAmount: number; totalRevenue: number;
}

export interface AiClinicUsage {
  clinicId: string; clinicName: string; credits: number; limit: number; period: string;
}

export interface AiPeriodStat { period: string; credits: number; }

export interface SaasNotification {
  id: string; type: 'issue' | 'new_sub' | 'cancel' | 'maintenance' | 'security';
  title: string; message: string; clinicName: string; time: string;
  read: boolean; severity: 'info' | 'warning' | 'critical';
}

export interface ReportItem {
  id: string; name: string; type: 'financial' | 'system' | 'operational' | 'resource';
  period: string; size: string; generated: string;
}

// ── Service ───────────────────────────────────────────────────────────────────

@Injectable({ providedIn: 'root' })
export class SaasAdminDataService {

  private base = `${environment.apiUrl}/saas-admin`;

  // ── Live metrics (client-side simulation — real OS metrics via overview endpoint) ──
  private _metrics = new BehaviorSubject<SystemMetric[]>(this.generateMetrics());
  metrics$ = this._metrics.asObservable();

  private _servers = new BehaviorSubject<ServerNode[]>(this.generateServers());
  servers$ = this._servers.asObservable();

  private _onlineUsers = new BehaviorSubject<number>(0);
  onlineUsers$ = this._onlineUsers.asObservable();

  constructor(private http: HttpClient) {
    this.startSimulation();
  }

  private get headers(): HttpHeaders {
    const token = localStorage.getItem('dm_token') || '';
    return new HttpHeaders({ Authorization: `Bearer ${token}` });
  }

  private startSimulation(): void {
    setInterval(() => {
      this._metrics.next(this.generateMetrics());
      const servers = this._servers.value.map(s => ({
        ...s,
        cpu:    Math.max(10, Math.min(95, s.cpu    + (Math.random() - 0.5) * 12)),
        memory: Math.max(20, Math.min(90, s.memory + (Math.random() - 0.5) * 8)),
        load:   Math.max(5,  Math.min(100, s.load  + (Math.random() - 0.5) * 15)),
      }));
      this._servers.next(servers);
    }, 2500);
  }

  private generateMetrics(): SystemMetric[] {
    const now = Date.now();
    return Array.from({ length: 20 }, (_, i) => ({
      time: new Date(now - (19 - i) * 3000).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      cpu:     30 + Math.random() * 45,
      latency: 40 + Math.random() * 80,
      load:    20 + Math.random() * 60,
      memory:  45 + Math.random() * 30,
    }));
  }

  private generateServers(): ServerNode[] {
    return [
      { id: 'srv-1', name: 'Node-US-East-1',  region: 'us-east-1',  status: 'healthy',  cpu: 42, memory: 58, load: 35 },
      { id: 'srv-2', name: 'Node-US-West-1',  region: 'us-west-1',  status: 'healthy',  cpu: 38, memory: 52, load: 28 },
      { id: 'srv-3', name: 'Node-EU-West-1',  region: 'eu-west-1',  status: 'warning',  cpu: 78, memory: 71, load: 82 },
      { id: 'srv-4', name: 'Node-AP-South-1', region: 'ap-south-1', status: 'healthy',  cpu: 55, memory: 63, load: 48 },
      { id: 'srv-5', name: 'Node-AP-East-1',  region: 'ap-east-1',  status: 'healthy',  cpu: 31, memory: 44, load: 22 },
      { id: 'srv-6', name: 'Node-US-East-2',  region: 'us-east-2',  status: 'critical', cpu: 91, memory: 88, load: 95 },
    ];
  }

  // ── Overview ───────────────────────────────────────────────────────────────

  getSystemOverview(): Observable<any> {
    return this.http.get(`${this.base}/overview`, { headers: this.headers }).pipe(
      map((r: any) => {
        this._onlineUsers.next(r.data?.totalUsers || 0);
        return {
          totalClinics:  r.data?.totalClinics  || 0,
          totalUsers:    r.data?.totalUsers    || 0,
          onlineUsers:   r.data?.totalUsers    || 0,
          activeServers: 6,
          maxServers:    10,
          uptime:        99.97,
          clinicSummary: r.data?.clinicSummary || [],
          system:        r.data?.system        || {},
        };
      }),
      catchError(() => of({ totalClinics: 0, totalUsers: 0, onlineUsers: 0, activeServers: 6, maxServers: 10, uptime: 99.97 }))
    );
  }

  // ── Revenue ────────────────────────────────────────────────────────────────

  getRevenueTimeline(): Observable<RevenuePoint[]> {
    return this.http.get(`${this.base}/revenue`, { headers: this.headers }).pipe(
      map((r: any) => r.data?.revenueTimeline || []),
      catchError(() => of([]))
    );
  }

  getPlanDistribution(): Observable<PlanDistribution[]> {
    return this.http.get(`${this.base}/revenue`, { headers: this.headers }).pipe(
      map((r: any) => r.data?.planDistribution || []),
      catchError(() => of([]))
    );
  }

  getFinancialSummary(): Observable<FinancialSummary> {
    return this.http.get(`${this.base}/revenue`, { headers: this.headers }).pipe(
      map((r: any) => r.data?.financialSummary || { serverCost: 0, pendingAmount: 0, receivedAmount: 0, totalRevenue: 0 }),
      catchError(() => of({ serverCost: 0, pendingAmount: 0, receivedAmount: 0, totalRevenue: 0 }))
    );
  }

  // ── Plans ──────────────────────────────────────────────────────────────────

  getPlans(): Observable<SubscriptionPlan[]> {
    return this.http.get(`${this.base}/plans`, { headers: this.headers }).pipe(
      map((r: any) => r.plans || []),
      catchError(() => of([]))
    );
  }

  savePlan(plan: SubscriptionPlan): Observable<any> {
    const isNew = !plan.id || plan.id.startsWith('p');
    if (isNew) {
      return this.http.post(`${this.base}/plans`, plan, { headers: this.headers });
    }
    return this.http.put(`${this.base}/plans/${plan.id}`, plan, { headers: this.headers });
  }

  deletePlan(id: string): Observable<any> {
    return this.http.delete(`${this.base}/plans/${id}`, { headers: this.headers });
  }

  // ── Clinics ────────────────────────────────────────────────────────────────

  getClinics(): Observable<ClinicRecord[]> {
    return this.http.get(`${this.base}/clinics`, { headers: this.headers }).pipe(
      map((r: any) => (r.clinics || []).map((c: any) => ({
        id:             c.id || c._id,
        name:           c.name,
        owner:          c.owner || '',
        email:          c.email || '',
        phone:          c.phone || '',
        plan:           c.plan || c.subscriptionPlan || 'basic',
        status:         c.status,
        users:          c.users || 0,
        joinDate:       c.joinDate || c.createdAt,
        location:       c.location || c.address || '',
        aiCreditsUsed:  c.aiCreditsUsed  || 0,
        aiCreditsLimit: c.aiCreditsLimit || 0,
        modules:        c.modules || {},
      }))),
      catchError(() => of([]))
    );
  }

  createClinic(data: Partial<ClinicRecord>): Observable<any> {
    return this.http.post(`${this.base}/clinics`, data, { headers: this.headers });
  }

  updateClinic(id: string, data: Partial<ClinicRecord>): Observable<any> {
    return this.http.patch(`${this.base}/clinics/${id}`, data, { headers: this.headers });
  }

  updateClinicStatus(id: string, status: 'active' | 'suspended' | 'blocked', maintenanceMessage = ''): Observable<any> {
    return this.http.patch(`${this.base}/clinics/${id}/status`, { status, maintenanceMessage }, { headers: this.headers });
  }

  updateClinicModules(id: string, modules: Record<string, boolean>): Observable<any> {
    return this.http.patch(`${this.base}/clinics/${id}/modules`, { modules }, { headers: this.headers });
  }

  deleteClinic(id: string): Observable<any> {
    return this.http.delete(`${this.base}/clinics/${id}`, { headers: this.headers });
  }

  blockAllClinics(maintenanceMessage = 'System maintenance in progress.'): Observable<any> {
    return this.http.patch(`${this.base}/clinics/block-all`, { maintenanceMessage }, { headers: this.headers });
  }

  // ── AI Credits ─────────────────────────────────────────────────────────────

  getAiClinicUsage(): Observable<AiClinicUsage[]> {
    return this.http.get(`${this.base}/ai-credits`, { headers: this.headers }).pipe(
      map((r: any) => r.data?.clinicUsage || []),
      catchError(() => of([]))
    );
  }

  getAiPeriodStats(): Observable<AiPeriodStat[]> {
    return this.http.get(`${this.base}/ai-credits`, { headers: this.headers }).pipe(
      map((r: any) => r.data?.periodStats || []),
      catchError(() => of([]))
    );
  }

  updateAiCredits(clinicId: string, aiCreditsLimit: number): Observable<any> {
    return this.http.patch(`${this.base}/clinics/${clinicId}/ai-credits`, { aiCreditsLimit }, { headers: this.headers });
  }

  // ── Notifications ──────────────────────────────────────────────────────────

  getNotifications(): Observable<SaasNotification[]> {
    return this.http.get(`${this.base}/notifications`, { headers: this.headers }).pipe(
      map((r: any) => r.notifications || []),
      catchError(() => of([]))
    );
  }

  markNotificationRead(id: string): Observable<any> {
    return this.http.patch(`${this.base}/notifications/${id}/read`, {}, { headers: this.headers });
  }

  markAllNotificationsRead(): Observable<any> {
    return this.http.patch(`${this.base}/notifications/mark-all-read`, {}, { headers: this.headers });
  }

  sendMaintenanceNotification(clinicId: string | 'all', scheduledAt: string, message: string): Observable<any> {
    return this.http.post(`${this.base}/notifications/maintenance`, { clinicId, scheduledAt, message }, { headers: this.headers });
  }

  // ── Reports ────────────────────────────────────────────────────────────────

  getReports(): Observable<any[]> {
    return this.http.get(`${this.base}/reports`, { headers: this.headers }).pipe(
      map((r: any) => r.reports || []),
      catchError(() => of([]))
    );
  }

  // ── Settings & Profile ─────────────────────────────────────────────────────

  getSettings(): Observable<any> {
    return this.http.get(`${this.base}/settings`, { headers: this.headers }).pipe(
      map((r: any) => r.settings || {}),
      catchError(() => of({}))
    );
  }

  updateSettings(settings: any): Observable<any> {
    return this.http.patch(`${this.base}/settings`, settings, { headers: this.headers });
  }

  updateProfile(data: { publicName?: string; email?: string; phone?: string }): Observable<any> {
    return this.http.patch(`${this.base}/profile`, data, { headers: this.headers });
  }
}
