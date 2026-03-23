import { Injectable } from '@angular/core';
import { CanActivate, Router, UrlTree } from '@angular/router';

@Injectable({ providedIn: 'root' })
export class CashierGuard implements CanActivate {
  // Allowed roles for the cashier route
  private readonly allowedRoles = ['cashier', 'admin'];

  constructor(private router: Router) {}

  canActivate(): boolean | UrlTree {
    // In production this would decode a JWT / check session storage.
    // For the mock environment we read a role flag set at login.
    const role = sessionStorage.getItem('dm_role') ?? 'cashier';
    if (this.allowedRoles.includes(role)) return true;
    return this.router.createUrlTree(['/login']);
  }
}
