import { Injectable } from '@angular/core';

export interface AppSettings {
  nativeLanguage: 'en' | 'es' | 'fr';
  practiceLanguage: 'en' | 'es' | 'fr';
}

const STORAGE_KEY = 'cas-lang-desktop-settings';

const DEFAULTS: AppSettings = {
  nativeLanguage: 'en',
  practiceLanguage: 'es',
};

@Injectable({ providedIn: 'root' })
export class SettingsService {
  private settings: AppSettings;

  constructor() {
    const stored = localStorage.getItem(STORAGE_KEY);
    this.settings = stored ? { ...DEFAULTS, ...JSON.parse(stored) } : { ...DEFAULTS };
  }

  get(): AppSettings {
    return { ...this.settings };
  }

  update(partial: Partial<AppSettings>): void {
    this.settings = { ...this.settings, ...partial };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.settings));
  }
}