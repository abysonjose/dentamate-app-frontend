import { Injectable } from '@angular/core';
import { CanActivate, Router, UrlTree } from '@angular/router';

@Injectable({ providedIn: 'root' })
export class SaasAdminGuard implements CanActivate {
  constructor(private router: Router) {}
  canActivate(): boolean | UrlTree {
    try {
      const raw = localStorage.getItem('dm_user');
      const user = raw ? JSON.parse(raw) : null;
      if (user?.role === 'saas_admin') return true;
    } catch {}
    return this.router.createUrlTree(['/login']);
  }
}
