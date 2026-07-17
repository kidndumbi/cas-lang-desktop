import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { CommonModule } from '@angular/common';
import { SettingsService, AppSettings } from '../services/settings.service';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatCardModule, MatFormFieldModule, MatSelectModule, MatButtonModule, MatCheckboxModule],
  template: `
    <div style="padding: 24px; max-width: 700px; margin: 0 auto; display: flex; flex-direction: column; gap: 16px;">
      <!-- Languages -->
      <mat-card>
        <mat-card-header><mat-card-title>Languages</mat-card-title></mat-card-header>
        <mat-card-content>
          <form [formGroup]="langForm" (ngSubmit)="saveLang()" style="display: flex; gap: 16px; flex-wrap: wrap; align-items: center;">
            <mat-form-field appearance="outline" style="flex: 1; min-width: 180px;">
              <mat-label>Native Language</mat-label>
              <mat-select formControlName="nativeLanguage">
                <mat-option value="en">English</mat-option>
                <mat-option value="es">Spanish</mat-option>
                <mat-option value="fr">French</mat-option>
              </mat-select>
            </mat-form-field>
            <mat-form-field appearance="outline" style="flex: 1; min-width: 180px;">
              <mat-label>Practice Language</mat-label>
              <mat-select formControlName="practiceLanguage">
                <mat-option value="en">English</mat-option>
                <mat-option value="es">Spanish</mat-option>
                <mat-option value="fr">French</mat-option>
              </mat-select>
            </mat-form-field>
            <button mat-raised-button color="primary" type="submit">Save</button>
          </form>
        </mat-card-content>
      </mat-card>

      <!-- Language Learning Exercise Types -->
      <mat-card>
        <mat-card-header><mat-card-title>Language Learning Exercise Types</mat-card-title></mat-card-header>
        <mat-card-content>
          <p style="font-size: 0.85em; color: #888; margin-bottom: 12px;">Check one or more types. When multiple are checked, a random type is picked each exercise.</p>
          @for (pt of practiceTypeDefs; track pt.id) {
            <div style="margin-bottom: 12px;">
              <mat-checkbox [checked]="isPracticeTypeEnabled(pt.id)" (change)="togglePracticeType(pt.id, $event.checked)">
                <strong>{{ pt.label }}</strong>
                <br><small style="color: #888;">{{ pt.desc }}</small>
              </mat-checkbox>
            </div>
          }
          <div style="margin-top: 8px;">
            <mat-checkbox [checked]="settings.spellTheBlanksEnabled" (change)="toggleSpellTheBlanks($event.checked)">
              <strong>Spell the Blanks</strong>
              <br><small style="color: #888;">Half the sentence is shown; type the missing words from memory.</small>
            </mat-checkbox>
          </div>
        </mat-card-content>
      </mat-card>

      <!-- Vocabulary Exercise Types -->
      <mat-card>
        <mat-card-header><mat-card-title>Vocabulary Exercise Types</mat-card-title></mat-card-header>
        <mat-card-content>
          <p style="font-size: 0.85em; color: #888; margin-bottom: 12px;">Check one or more types. When multiple are checked, a random type is picked for each vocabulary word.</p>
          @for (vt of vocabTypeDefs; track vt.id) {
            <div style="margin-bottom: 12px;">
              <mat-checkbox [checked]="isVocabTypeEnabled(vt.id)" (change)="toggleVocabType(vt.id, $event.checked)">
                <strong>{{ vt.label }}</strong>
                <br><small style="color: #888;">{{ vt.desc }}</small>
              </mat-checkbox>
            </div>
          }
        </mat-card-content>
      </mat-card>
    </div>
  `,
})
export class SettingsComponent implements OnInit {
  langForm: FormGroup;
  settings: AppSettings;

  practiceTypeDefs = [
    { id: 'arrange-words', label: 'Arrange Words', desc: 'Unscramble all words into the correct order.' },
    { id: 'fill-in-missing', label: 'Fill in Missing Words', desc: 'Half the sentence is shown; supply the rest by tapping word chips.' },
    { id: 'conversation', label: 'Dialogue Practice', desc: 'AI generates a two-line dialogue; pick the correct response from 4 options. Requires AI.' },
  ];

  vocabTypeDefs = [
    { id: 'multiple-choice', label: 'Multiple Choice', desc: 'See the word, pick the correct meaning from four options.' },
    { id: 'spell-word', label: 'Spell the Word', desc: 'See the definition, spell the vocabulary word by selecting scrambled letters.' },
    { id: 'type-word', label: 'Type the Word', desc: 'See the definition, type the vocabulary word from memory.' },
  ];

  constructor(private fb: FormBuilder, private ss: SettingsService) {
    this.settings = this.ss.get();
    this.langForm = this.fb.group({
      nativeLanguage: [this.settings.nativeLanguage],
      practiceLanguage: [this.settings.practiceLanguage],
    });
  }

  ngOnInit() {}

  saveLang() {
    if (this.langForm.valid) {
      this.ss.update(this.langForm.value as Partial<AppSettings>);
      alert('Languages saved!');
    }
  }

  isPracticeTypeEnabled(id: string) { return this.settings.practiceTypes.includes(id); }
  isVocabTypeEnabled(id: string) { return this.settings.vocabularyExerciseTypes.includes(id); }

  togglePracticeType(id: string, enabled: boolean) {
    this.ss.togglePracticeType(id, enabled);
    this.settings = this.ss.get();
  }
  toggleVocabType(id: string, enabled: boolean) {
    this.ss.toggleVocabularyExerciseType(id, enabled);
    this.settings = this.ss.get();
  }
  toggleSpellTheBlanks(enabled: boolean) {
    this.settings.spellTheBlanksEnabled = enabled;
    if (enabled) { if (!this.settings.practiceTypes.includes('spell-the-blanks')) this.settings.practiceTypes.push('spell-the-blanks'); }
    else { const i = this.settings.practiceTypes.indexOf('spell-the-blanks'); if (i >= 0) this.settings.practiceTypes.splice(i, 1); }
    this.ss.update({ practiceTypes: this.settings.practiceTypes });
  }
}