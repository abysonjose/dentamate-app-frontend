import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';

// Login
import { LoginComponent } from './features/login/login.component';

// Clinic Register (Landing Page)
import { ClinicRegisterComponent } from './features/clinic-register/clinic-register.component';

// Dashboard shell
import { DashboardComponent } from './features/dashboard/dashboard.component';

// Dashboard sub-components
import { ToothViewerComponent }    from './features/dashboard/components/tooth-viewer/tooth-viewer.component';
import { AppointmentsComponent }   from './features/dashboard/components/appointments/appointments.component';
import { AiChatComponent }         from './features/dashboard/components/ai-chat/ai-chat.component';
import { MedicalRecordsComponent } from './features/dashboard/components/medical-records/medical-records.component';
import { FinancialsComponent }     from './features/dashboard/components/financials/financials.component';
import { ActivityFeedComponent }   from './features/dashboard/components/activity-feed/activity-feed.component';
import { FeedbackComponent }       from './features/dashboard/components/feedback/feedback.component';
import { SettingsComponent }        from './features/dashboard/components/settings/settings.component';
import { PatientProfileComponent } from './features/dashboard/components/patient-profile/patient-profile.component';

// Pipes
import { BoldMarkdownPipe } from './core/pipes/bold-markdown.pipe';

// Doctor Dashboard
import { DoctorDashboardComponent }   from './features/doctor/doctor-dashboard.component';
import { DocLiveQueueComponent }       from './features/doctor/components/live-queue/doc-live-queue.component';
import { DocClinicalComponent }        from './features/doctor/components/clinical/doc-clinical.component';
import { DocDentalChartComponent }     from './features/doctor/components/dental-chart/doc-dental-chart.component';
import { DocAiPanelComponent }         from './features/doctor/components/ai-panel/doc-ai-panel.component';
import { DocArSmileComponent }         from './features/doctor/components/ar-smile/doc-ar-smile.component';
import { DocStaffChatComponent }       from './features/doctor/components/staff-chat/doc-staff-chat.component';
import { DocNotificationsComponent }   from './features/doctor/components/notifications/doc-notifications.component';
import { DocSettingsComponent }        from './features/doctor/components/settings/doc-settings.component';

// Receptionist Dashboard
import { ReceptionistDashboardComponent } from './features/receptionist/receptionist-dashboard.component';
import { RecSettingsComponent }           from './features/receptionist/components/settings/rec-settings.component';
import { LiveQueueComponent }             from './features/receptionist/components/live-queue/live-queue.component';
import { RecAppointmentsComponent }       from './features/receptionist/components/appointments/rec-appointments.component';
import { PatientLookupComponent }         from './features/receptionist/components/patient-lookup/patient-lookup.component';
import { StaffChatComponent }             from './features/receptionist/components/staff-chat/staff-chat.component';
import { RecNotificationsComponent }      from './features/receptionist/components/notifications/rec-notifications.component';
import { Clinic3dComponent }              from './features/receptionist/components/clinic3d/clinic3d.component';
import { PatientRegistrationComponent }  from './features/receptionist/components/patient-registration/patient-registration.component';

// Lab Manager Dashboard
import { LabDashboardComponent }         from './features/lab/lab-dashboard.component';
import { LabWorkflowComponent }          from './features/lab/components/workflow/lab-workflow.component';
import { LabReportHistoryComponent }     from './features/lab/components/report-history/lab-report-history.component';
import { LabStaffChatComponent }         from './features/lab/components/staff-chat/lab-staff-chat.component';
import { LabNotificationsComponent }     from './features/lab/components/notifications/lab-notifications.component';
import { LabVisualizerComponent }        from './features/lab/components/visualizer/lab-visualizer.component';
import { LabSettingsComponent }          from './features/lab/components/settings/lab-settings.component';

// Cashier Dashboard
import { CashierDashboardComponent }       from './features/cashier/cashier-dashboard.component';
import { CashierBillingComponent }         from './features/cashier/components/billing/cashier-billing.component';
import { CashierReportsComponent }         from './features/cashier/components/reports/cashier-reports.component';
import { CashierStaffChatComponent }       from './features/cashier/components/staff-chat/cashier-staff-chat.component';
import { CashierNotificationsComponent }   from './features/cashier/components/notifications/cashier-notifications.component';
import { CashierPulse3dComponent }         from './features/cashier/components/pulse3d/cashier-pulse3d.component';
import { CashierSettingsComponent }        from './features/cashier/components/settings/cashier-settings.component';

// Pharmacist Dashboard
import { PharmacistDashboardComponent }  from './features/pharmacist/pharmacist-dashboard.component';
import { PharmDeliveryComponent }        from './features/pharmacist/components/delivery/pharm-delivery.component';
import { PharmInventoryComponent }       from './features/pharmacist/components/inventory/pharm-inventory.component';
import { PharmShelf3dComponent }         from './features/pharmacist/components/shelf3d/pharm-shelf3d.component';
import { PharmStaffChatComponent }       from './features/pharmacist/components/staff-chat/pharm-staff-chat.component';
import { PharmNotificationsComponent }   from './features/pharmacist/components/notifications/pharm-notifications.component';
import { PharmSettingsComponent }        from './features/pharmacist/components/settings/pharm-settings.component';

// SaaS Admin Dashboard
import { SaasAdminDashboardComponent }  from './features/saas-admin/saas-admin-dashboard.component';
import { SaOverviewComponent }          from './features/saas-admin/components/overview/sa-overview.component';
import { SaRevenueComponent }           from './features/saas-admin/components/revenue/sa-revenue.component';
import { SaPlansComponent }             from './features/saas-admin/components/plans/sa-plans.component';
import { SaClinicsComponent }           from './features/saas-admin/components/clinics/sa-clinics.component';
import { SaAiServicesComponent }        from './features/saas-admin/components/ai-services/sa-ai-services.component';
import { SaNotificationsComponent }     from './features/saas-admin/components/notifications/sa-notifications.component';
import { SaReportsComponent }           from './features/saas-admin/components/reports/sa-reports.component';
import { SaNetwork3dComponent }         from './features/saas-admin/components/network3d/sa-network3d.component';
import { SaSettingsComponent }          from './features/saas-admin/components/settings/sa-settings.component';

// Clinic Admin Dashboard
import { ClinicAdminDashboardComponent } from './features/clinic-admin/clinic-admin-dashboard.component';
import { CaOverviewComponent }           from './features/clinic-admin/components/overview/ca-overview.component';
import { CaStaffComponent }              from './features/clinic-admin/components/staff/ca-staff.component';
import { CaPatientsComponent }           from './features/clinic-admin/components/patients/ca-patients.component';
import { CaInventoryComponent }          from './features/clinic-admin/components/inventory/ca-inventory.component';
import { CaTreatmentComponent }          from './features/clinic-admin/components/treatment/ca-treatment.component';
import { CaAiServicesComponent }         from './features/clinic-admin/components/ai-services/ca-ai-services.component';
import { CaNotificationsComponent }      from './features/clinic-admin/components/notifications/ca-notifications.component';
import { CaLogsComponent }               from './features/clinic-admin/components/logs/ca-logs.component';
import { CaSubscriptionComponent }       from './features/clinic-admin/components/subscription/ca-subscription.component';
import { CaFeedbacksComponent }          from './features/clinic-admin/components/feedbacks/ca-feedbacks.component';
import { CaChatComponent }               from './features/clinic-admin/components/chat/ca-chat.component';
import { CaSettingsComponent }           from './features/clinic-admin/components/settings/ca-settings.component';
import { CaClinic3dComponent }           from './features/clinic-admin/components/clinic3d/ca-clinic3d.component';

import { StaffChatService } from './core/services/staff-chat.service';
import { QueueService }     from './core/services/queue.service';
import { AuthService }      from './core/services/auth.service';

// Shared
import { SharedStaffChatComponent } from './shared/staff-chat/shared-staff-chat.component';

// Services
import { ThreeService }              from './core/services/three.service';
import { ThemeService }              from './core/services/theme.service';
import { DashboardDataService }      from './core/services/dashboard-data.service';
import { SoundService }              from './core/services/sound.service';
import { ReceptionistDataService }   from './core/services/receptionist-data.service';
import { LabDataService }            from './core/services/lab-data.service';

import { CurrencyPipe, TitleCasePipe, DecimalPipe } from '@angular/common';
import { ClinicAdminDataService } from './core/services/clinic-admin-data.service';
import { ClinicAdminGuard } from './core/guards/clinic-admin.guard';
import { SaasAdminDataService } from './core/services/saas-admin-data.service';
import { SaasAdminGuard } from './core/guards/saas-admin.guard';

@NgModule({
  declarations: [
    AppComponent,
    LoginComponent,
    ClinicRegisterComponent,
    DashboardComponent,
    ToothViewerComponent,
    AppointmentsComponent,
    AiChatComponent,
    MedicalRecordsComponent,
    FinancialsComponent,
    ActivityFeedComponent,
    FeedbackComponent,
    SettingsComponent,
    PatientProfileComponent,
    BoldMarkdownPipe,
    // Doctor
    DoctorDashboardComponent,
    DocLiveQueueComponent,
    DocClinicalComponent,
    DocDentalChartComponent,
    DocAiPanelComponent,
    DocArSmileComponent,
    DocStaffChatComponent,
    DocNotificationsComponent,
    DocSettingsComponent,
    // Receptionist
    ReceptionistDashboardComponent,
    LiveQueueComponent,
    RecAppointmentsComponent,
    RecSettingsComponent,
    PatientLookupComponent,
    StaffChatComponent,
    RecNotificationsComponent,
    Clinic3dComponent,
    PatientRegistrationComponent,
    // Lab Manager
    LabDashboardComponent,
    LabWorkflowComponent,
    LabReportHistoryComponent,
    LabStaffChatComponent,
    LabNotificationsComponent,
    LabVisualizerComponent,
    LabSettingsComponent,
    // Cashier
    CashierDashboardComponent,
    CashierBillingComponent,
    CashierReportsComponent,
    CashierStaffChatComponent,
    CashierNotificationsComponent,
    CashierPulse3dComponent,
    CashierSettingsComponent,
    // Pharmacist
    PharmacistDashboardComponent,
    PharmDeliveryComponent,
    PharmInventoryComponent,
    PharmShelf3dComponent,
    PharmStaffChatComponent,
    PharmNotificationsComponent,
    PharmSettingsComponent,
    // Clinic Admin
    ClinicAdminDashboardComponent,
    CaOverviewComponent,
    CaStaffComponent,
    CaPatientsComponent,
    CaInventoryComponent,
    CaTreatmentComponent,
    CaAiServicesComponent,
    CaNotificationsComponent,
    CaLogsComponent,
    CaSubscriptionComponent,
    CaFeedbacksComponent,
    CaChatComponent,
    CaSettingsComponent,
    CaClinic3dComponent,
    // Shared
    SharedStaffChatComponent,
    // SaaS Admin
    SaasAdminDashboardComponent,
    SaOverviewComponent,
    SaRevenueComponent,
    SaPlansComponent,
    SaClinicsComponent,
    SaAiServicesComponent,
    SaNotificationsComponent,
    SaReportsComponent,
    SaNetwork3dComponent,
    SaSettingsComponent,
  ],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    HttpClientModule,
    ReactiveFormsModule,
    FormsModule,
    AppRoutingModule,
  ],
  providers: [ThreeService, ThemeService, DashboardDataService, SoundService, ReceptionistDataService, LabDataService, ClinicAdminDataService, SaasAdminDataService, CurrencyPipe, TitleCasePipe, DecimalPipe, StaffChatService, QueueService, AuthService],
  bootstrap: [AppComponent]
})
export class AppModule {}
