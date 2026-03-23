import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { LoginComponent }                  from './features/login/login.component';
import { ClinicRegisterComponent }         from './features/clinic-register/clinic-register.component';
import { DashboardComponent }              from './features/dashboard/dashboard.component';
import { ReceptionistDashboardComponent }  from './features/receptionist/receptionist-dashboard.component';
import { DoctorDashboardComponent }        from './features/doctor/doctor-dashboard.component';
import { LabDashboardComponent }           from './features/lab/lab-dashboard.component';
import { CashierDashboardComponent }       from './features/cashier/cashier-dashboard.component';
import { CashierGuard }                    from './core/guards/cashier.guard';
import { PharmacistDashboardComponent }    from './features/pharmacist/pharmacist-dashboard.component';
import { ClinicAdminDashboardComponent }   from './features/clinic-admin/clinic-admin-dashboard.component';
import { ClinicAdminGuard }                from './core/guards/clinic-admin.guard';

import { SaasAdminDashboardComponent }  from './features/saas-admin/saas-admin-dashboard.component';
import { SaasAdminGuard }               from './core/guards/saas-admin.guard';

const routes: Routes = [
  { path: '',             redirectTo: 'register',    pathMatch: 'full' },
  { path: 'register',     component: ClinicRegisterComponent },
  { path: 'login',        component: LoginComponent },
  { path: 'dashboard',    component: DashboardComponent },
  { path: 'receptionist', component: ReceptionistDashboardComponent },
  { path: 'doctor',       component: DoctorDashboardComponent },
  { path: 'lab',          component: LabDashboardComponent },
  { path: 'cashier',      component: CashierDashboardComponent, canActivate: [CashierGuard] },
  { path: 'pharmacist',   component: PharmacistDashboardComponent },
  { path: 'clinic-admin', component: ClinicAdminDashboardComponent, canActivate: [ClinicAdminGuard] },
  { path: 'saas-admin',   component: SaasAdminDashboardComponent,   canActivate: [SaasAdminGuard] },
  { path: '**',           redirectTo: 'login' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule {}

