import { Component } from '@angular/core';
import { ThemeService } from '../../../../core/services/theme.service';
import { SoundService } from '../../../../core/services/sound.service';
import { SaasAdminDataService } from '../../../../core/services/saas-admin-data.service';

@Component({
  selector: 'app-sa-settings',
  templateUrl: './sa-settings.component.html',
  styleUrls: ['./sa-settings.component.scss']
})
export class SaSettingsComponent {
  blockAllConfirm = false;
  blockAllDone = false;

  constructor(
    public themeService: ThemeService,
    public soundService: SoundService,
    private saasData: SaasAdminDataService
  ) {}

  blockAll(): void {
    this.saasData.blockAllClinics().subscribe(() => {
      this.blockAllConfirm = false;
      this.blockAllDone = true;
      this.soundService.playError();
      setTimeout(() => this.blockAllDone = false, 4000);
    });
  }
}
