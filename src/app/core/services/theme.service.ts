import { Injectable, Renderer2, RendererFactory2 } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export type Theme = 'dark' | 'light';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private renderer: Renderer2;
  private _theme = new BehaviorSubject<Theme>('dark');
  theme$ = this._theme.asObservable();

  constructor(factory: RendererFactory2) {
    this.renderer = factory.createRenderer(null, null);
    const saved = (localStorage.getItem('dm-theme') as Theme) || 'dark';
    this.apply(saved);
    // Restore saved accent color so it survives page refresh
    this.restoreAccent();
  }

  private restoreAccent(): void {
    const accentMap: Record<string, { accent: string; dim: string }> = {
      teal:   { accent: '#14b8a6', dim: 'rgba(20,184,166,0.15)' },
      blue:   { accent: '#3b82f6', dim: 'rgba(59,130,246,0.15)' },
      purple: { accent: '#a855f7', dim: 'rgba(168,85,247,0.15)' },
      rose:   { accent: '#f43f5e', dim: 'rgba(244,63,94,0.15)'  },
    };
    const saved = localStorage.getItem('dm-accent') || 'teal';
    const { accent, dim } = accentMap[saved] ?? accentMap['teal'];
    document.documentElement.style.setProperty('--accent', accent);
    document.documentElement.style.setProperty('--accent-dim', dim);
  }

  get current(): Theme { return this._theme.value; }

  toggle(): void { this.apply(this._theme.value === 'dark' ? 'light' : 'dark'); }

  private apply(theme: Theme): void {
    const html = document.documentElement;
    this.renderer.removeClass(html, theme === 'dark' ? 'light' : 'dark');
    this.renderer.addClass(html, theme);
    this._theme.next(theme);
    localStorage.setItem('dm-theme', theme);
  }
}
