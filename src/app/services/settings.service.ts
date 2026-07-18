import { Injectable, signal } from '@angular/core';

export interface AppSettings {
  nativeLanguage: 'en' | 'es' | 'fr';
  practiceLanguage: 'en' | 'es' | 'fr';
  practiceTypes: string[];
  vocabularyExerciseTypes: string[];
  deepseekApiKey?: string;
}

const STORAGE_KEY = 'cas-lang-desktop-settings';

const DEFAULTS: AppSettings = {
  nativeLanguage: 'en',
  practiceLanguage: 'es',
  practiceTypes: ['arrange-words', 'fill-in-missing', 'spell-the-blanks'],
  vocabularyExerciseTypes: ['multiple-choice', 'spell-word', 'type-word'],
};

@Injectable({ providedIn: 'root' })
export class SettingsService {
  private _settings: AppSettings;

  practiceTypes = signal<string[]>([]);
  vocabularyExerciseTypes = signal<string[]>([]);

  constructor() {
    const stored = localStorage.getItem(STORAGE_KEY);
    const raw = stored ? JSON.parse(stored) : {};
    // Migrate: if old spellTheBlanksEnabled was true and spell-the-blanks not in practiceTypes, add it
    let practiceTypes: string[] = raw.practiceTypes ?? DEFAULTS.practiceTypes;
    if (raw.spellTheBlanksEnabled === true && !practiceTypes.includes('spell-the-blanks')) {
      practiceTypes = [...practiceTypes, 'spell-the-blanks'];
    }
    this._settings = { ...DEFAULTS, ...raw, practiceTypes };
    this.practiceTypes.set(this._settings.practiceTypes);
    this.vocabularyExerciseTypes.set(this._settings.vocabularyExerciseTypes);
  }

  get(): AppSettings { return { ...this._settings }; }

  update(partial: Partial<AppSettings>): void {
    this._settings = { ...this._settings, ...partial };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this._settings));
    if (partial.practiceTypes !== undefined) this.practiceTypes.set(this._settings.practiceTypes);
    if (partial.vocabularyExerciseTypes !== undefined) this.vocabularyExerciseTypes.set(this._settings.vocabularyExerciseTypes);
  }

  togglePracticeType(type: string, enabled: boolean): void {
    const types = [...this._settings.practiceTypes];
    if (enabled) { if (!types.includes(type)) types.push(type); }
    else { const idx = types.indexOf(type); if (idx >= 0) types.splice(idx, 1); if (types.length === 0) types.push(type); }
    this.update({ practiceTypes: types });
  }

  toggleVocabularyExerciseType(type: string, enabled: boolean): void {
    const types = [...this._settings.vocabularyExerciseTypes];
    if (enabled) { if (!types.includes(type)) types.push(type); }
    else { const idx = types.indexOf(type); if (idx >= 0) types.splice(idx, 1); if (types.length === 0) types.push(type); }
    this.update({ vocabularyExerciseTypes: types });
  }
}