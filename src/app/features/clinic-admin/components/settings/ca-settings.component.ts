import { Component } from '@angular/core';
import { ThemeService } from '../../../../core/services/theme.service';
import { SoundService } from '../../../../core/services/sound.service';

@Component({
  selector: 'app-ca-settings',
  templateUrl: './ca-settings.component.html',
  styleUrls: ['./ca-settings.component.scss']
})
export class CaSettingsComponent {
  // Password change flow
  pwStep: 'idle' | 'otp-sent' | 'verify' | 'done' = 'idle';
  otpInput = '';
  newPassword = '';
  confirmPassword = '';
  pwError = '';
  mockOtp = '123456';

  // Accent colors
  accents = [
    { name: 'teal',   color: '#14b8a6', dim: 'rgba(20,184,166,0.15)'  },
    { name: 'blue',   color: '#3b82f6', dim: 'rgba(59,130,246,0.15)'  },
    { name: 'purple', color: '#a855f7', dim: 'rgba(168,85,247,0.15)'  },
    { name: 'rose',   color: '#f43f5e', dim: 'rgba(244,63,94,0.15)'   },
  ];
  selectedAccent = localStorage.getItem('dm-accent') || 'teal';

  soundEnabled = true;
  notifEnabled = true;

  constructor(public themeService: ThemeService, public soundService: SoundService) {}

  sendOtp(): void { this.pwStep = 'otp-sent'; this.pwError = ''; }

  verifyOtp(): void {
    if (this.otpInput === this.mockOtp) { this.pwStep = 'verify'; this.pwError = ''; }
    else { this.pwError = 'Invalid OTP. Try 123456 for demo.'; }
  }

  savePassword(): void {
    if (this.newPassword.length < 6) { this.pwError = 'Password must be at least 6 characters.'; return; }
    if (this.newPassword !== this.confirmPassword) { this.pwError = 'Passwords do not match.'; return; }
    this.pwStep = 'done'; this.pwError = '';
  }

  resetPw(): void { this.pwStep = 'idle'; this.otpInput = ''; this.newPassword = ''; this.confirmPassword = ''; this.pwError = ''; }

  setAccent(name: string): void {
    const a = this.accents.find(x => x.name === name);
    if (!a) return;
    this.selectedAccent = name;
    localStorage.setItem('dm-accent', name);
    document.documentElement.style.setProperty('--accent', a.color);
    document.documentElement.style.setProperty('--accent-dim', a.dim);
  }
}
