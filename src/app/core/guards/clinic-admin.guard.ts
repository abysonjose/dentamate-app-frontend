import { Injectable } from '@angular/core';
import { CanActivate, Router, UrlTree } from '@angular/router';

@Injectable({ providedIn: 'root' })
export class ClinicAdminGuard implements CanActivate {
  private readonly allowedRoles = ['clinicAdmin', 'admin'];
  constructor(private router: Router) {}
  canActivate(): boolean | UrlTree {
    const role = sessionStorage.getItem('dm_role') ?? 'clinicAdmin';
    if (this.allowedRoles.includes(role)) return true;
    return this.router.createUrlTree(['/login']);
  }
}
