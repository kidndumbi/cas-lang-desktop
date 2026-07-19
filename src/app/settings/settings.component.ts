import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { CommonModule } from '@angular/common';
import { SettingsService, AppSettings } from '../services/settings.service';
import { LlmService } from '../services/llm.service';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatCardModule, MatFormFieldModule, MatSelectModule, MatButtonModule, MatCheckboxModule, MatInputModule, MatIconModule, MatProgressSpinnerModule],
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

      <!-- DeepSeek API Key -->
      <mat-card>
        <mat-card-header><mat-card-title>DeepSeek API Key</mat-card-title></mat-card-header>
        <mat-card-content>
          <p style="font-size: 0.85em; color: #888; margin-bottom: 12px;">
            Used for AI translation and AI chat features. Get a key at <a href="https://platform.deepseek.com/api_keys" target="_blank">platform.deepseek.com</a>.
          </p>
          <div style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap;">
            <mat-form-field appearance="outline" style="flex: 1; min-width: 250px;">
              <mat-label>API Key</mat-label>
              <input matInput [value]="llmService.deepseekApiKey()" (input)="onApiKeyChange($event)" placeholder="sk-..." type="password" [disabled]="llmService.isTestingDeepseekKey()">
              <mat-icon matSuffix>key</mat-icon>
            </mat-form-field>
            <button mat-raised-button color="primary" (click)="saveAndTestApiKey()" [disabled]="llmService.isTestingDeepseekKey()">
              @if (llmService.isTestingDeepseekKey()) {
                <mat-spinner diameter="20" style="display: inline-block; margin-right: 8px;"></mat-spinner>
              }
              Save & Test
            </button>
          </div>
          @if (llmService.deepseekKeyTestResult() !== 'idle') {
            <div style="margin-top: 8px; padding: 8px 12px; border-radius: 4px;"
              [style.background]="llmService.deepseekKeyTestResult() === 'success' ? '#e8f5e9' : '#fbe9e7'">
              <span [style.color]="llmService.deepseekKeyTestResult() === 'success' ? '#2e7d32' : '#c62828'" style="font-size: 0.85em;">
                @if (llmService.deepseekKeyTestResult() === 'success') {
                  <mat-icon style="font-size: 16px; vertical-align: middle;">check_circle</mat-icon>
                }
                @else {
                  <mat-icon style="font-size: 16px; vertical-align: middle;">error</mat-icon>
                }
                {{ llmService.deepseekKeyTestMessage() }}
              </span>
            </div>
          }
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
  llmService = inject(LlmService);

  practiceTypeDefs = [
    { id: 'arrange-words', label: 'Arrange Words', desc: 'Unscramble all words into the correct order.' },
    { id: 'fill-in-missing', label: 'Fill in Missing Words', desc: 'Half the sentence is shown; type the missing words.' },
    { id: 'spell-the-blanks', label: 'Spell the Blanks', desc: 'Half the sentence is shown; type the missing words from memory.' },
    { id: 'conversation', label: 'Dialogue Practice', desc: 'AI generates a two-line dialogue; pick the correct response from 4 options. Requires AI.' },
  ];

  vocabTypeDefs = [
    { id: 'multiple-choice', label: 'Multiple Choice', desc: 'See the word, pick the correct meaning from four options.' },
    { id: 'spell-word', label: 'Spell the Word', desc: 'See the definition, spell the vocabulary word by selecting scrambled letters.' },
    { id: 'type-word', label: 'Type the Word', desc: 'See the definition, type the vocabulary word from memory.' },
  ];

  private apiKeyDraft = '';

  constructor(private fb: FormBuilder, private ss: SettingsService) {
    const settings = this.ss.get();
    this.langForm = this.fb.group({
      nativeLanguage: [settings.nativeLanguage],
      practiceLanguage: [settings.practiceLanguage],
    });
  }

  ngOnInit() {}

  onApiKeyChange(event: Event): void {
    this.apiKeyDraft = (event.target as HTMLInputElement).value;
  }

  async saveAndTestApiKey(): Promise<void> {
    const key = this.apiKeyDraft.trim();
    this.llmService.setDeepseekApiKey(key);
    if (key) {
      await this.llmService.testDeepseekApiKey();
    }
  }

  saveLang() {
    if (this.langForm.valid) {
      this.ss.update(this.langForm.value as Partial<AppSettings>);
      alert('Languages saved!');
    }
  }

  isPracticeTypeEnabled(id: string) { return this.ss.practiceTypes().includes(id); }
  isVocabTypeEnabled(id: string) { return this.ss.vocabularyExerciseTypes().includes(id); }

  togglePracticeType(id: string, enabled: boolean) { this.ss.togglePracticeType(id, enabled); }
  toggleVocabType(id: string, enabled: boolean) { this.ss.toggleVocabularyExerciseType(id, enabled); }
}