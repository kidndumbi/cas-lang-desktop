import { Injectable } from '@angular/core';

export interface AppSettings {
  nativeLanguage: 'en' | 'es' | 'fr';
  practiceLanguage: 'en' | 'es' | 'fr';
  practiceTypes: string[];
  vocabularyExerciseTypes: string[];
  spellTheBlanksEnabled: boolean;
}

const STORAGE_KEY = 'cas-lang-desktop-settings';

const DEFAULTS: AppSettings = {
  nativeLanguage: 'en',
  practiceLanguage: 'es',
  practiceTypes: ['arrange-words', 'fill-in-missing', 'spell-the-blanks'],
  vocabularyExerciseTypes: ['multiple-choice', 'spell-word', 'type-word'],
  spellTheBlanksEnabled: true,
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

  togglePracticeType(type: string, enabled: boolean): void {
    const types = [...this.settings.practiceTypes];
    if (enabled) { if (!types.includes(type)) types.push(type); }
    else { const idx = types.indexOf(type); if (idx >= 0) types.splice(idx, 1); }
    this.update({ practiceTypes: types });
  }

  toggleVocabularyExerciseType(type: string, enabled: boolean): void {
    const types = [...this.settings.vocabularyExerciseTypes];
    if (enabled) { if (!types.includes(type)) types.push(type); }
    else { const idx = types.indexOf(type); if (idx >= 0) types.splice(idx, 1); }
    this.update({ vocabularyExerciseTypes: types });
  }
}