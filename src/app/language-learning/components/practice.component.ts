import { Component, OnInit, OnDestroy, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { ExerciseService } from '../../services/exercise.service';
import { SettingsService } from '../../services/settings.service';

type PracticeMode = 'arrange-words' | 'fill-in-missing';

@Component({
  selector: 'app-practice',
  standalone: true,
  imports: [CommonModule, FormsModule, MatCardModule, MatButtonModule, MatIconModule, MatChipsModule, MatSnackBarModule],
  template: `
    <div style="padding: 24px; max-width: 900px; margin: 0 auto;">
      <div *ngIf="!exercise" style="text-align: center; padding: 60px 20px;">
        <mat-icon style="font-size: 64px; height: 64px; width: 64px; color: #3f51b5;">school</mat-icon>
        <h2>No exercises available</h2>
        <p style="color: #888;">Create exercises in the Exercises tab to start practicing.</p>
      </div>

      <mat-card *ngIf="exercise" style="margin-bottom: 16px;">
        <mat-card-content style="padding: 24px;">
          <!-- Header -->
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px;">
            <div>
              <mat-chip-set role="list">
                <mat-chip-row role="listitem">
                  {{ (exercise.practiceLanguage || exercise['practice_language']) | uppercase }} → {{ (exercise.nativeLanguage || exercise['native_language']) | uppercase }}
                </mat-chip-row>
              </mat-chip-set>
              <div style="margin-top: 8px; font-size: 0.85em; color: #666;">
                Mode: {{ practiceMode === 'arrange-words' ? 'Arrange Words' : 'Fill in Missing' }}
                · {{ exercise.wordCount || exercise['word_count'] || 0 }} words
              </div>
            </div>
            <button mat-icon-button color="primary" (click)="toggleMode()" title="Switch mode">
              <mat-icon>{{ practiceMode === 'arrange-words' ? 'edit_note' : 'drag_indicator' }}</mat-icon>
            </button>
          </div>

          <!-- Native reference -->
          <div style="background: #e8eaf6; border-radius: 8px; padding: 16px; margin-bottom: 20px;">
            <div style="font-size: 0.8em; color: #5c6bc0; margin-bottom: 4px;">Reference ({{ (exercise.nativeLanguage || exercise['native_language']) | uppercase }})</div>
            <div style="font-size: 1.1em; font-weight: 500;">{{ exercise.nativeLanguageText || exercise['native_language_text'] }}</div>
          </div>

          <!-- Arrange Words mode -->
          <div *ngIf="practiceMode === 'arrange-words'">
            <div style="font-size: 0.8em; color: #888; margin-bottom: 8px;">Arrange the words in correct order:</div>
            <div *ngIf="selectedWords.length > 0"
              style="min-height: 48px; border: 2px dashed #3f51b5; border-radius: 8px; padding: 8px; margin-bottom: 12px; display: flex; flex-wrap: wrap; gap: 6px; background: #f3f5ff;">
              <mat-chip-set role="list">
                <mat-chip-row *ngFor="let word of selectedWords; let i = index"
                  (click)="removeWord(i)" color="primary" highlighted role="listitem"
                  style="cursor: pointer;">
                  {{ word }}
                </mat-chip-row>
              </mat-chip-set>
            </div>
            <div *ngIf="selectedWords.length === 0"
              style="min-height: 48px; border: 2px dashed #ccc; border-radius: 8px; padding: 8px; margin-bottom: 12px; display: flex; align-items: center; justify-content: center; color: #aaa;">
              Tap words below to arrange them here
            </div>
            <mat-chip-set role="list" style="display: flex; flex-wrap: wrap; gap: 6px;">
              <mat-chip-row *ngFor="let word of availableWords; let i = index"
                (click)="selectWord(word, i)" color="accent" role="listitem" style="cursor: pointer;">
                {{ word }}
              </mat-chip-row>
            </mat-chip-set>
          </div>

          <!-- Fill in Missing mode -->
          <div *ngIf="practiceMode === 'fill-in-missing'">
            <div style="font-size: 0.8em; color: #888; margin-bottom: 8px;">Fill in the missing words:</div>
            <div style="font-size: 1.15em; line-height: 2.2;">
              <ng-container *ngFor="let part of fillTemplate; let i = index">
                <input *ngIf="part.isBlank" type="text" [value]="blankAnswers[i] || ''"
                  (input)="onBlankChange($event, i)" placeholder="?"
                  style="width: 80px; padding: 4px 8px; border: 2px solid #3f51b5; border-radius: 4px; text-align: center; font-size: 1em; margin: 0 4px;"
                  autocomplete="off" spellcheck="false">
                <span *ngIf="!part.isBlank">{{ part.text }}</span>
              </ng-container>
            </div>
          </div>

          <!-- Feedback -->
          <div *ngIf="showResult" style="margin-top: 16px; border-radius: 8px; padding: 16px;"
            [style.background]="isCorrect ? '#e8f5e9' : '#fbe9e7'">
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
              <mat-icon [style.color]="isCorrect ? '#2e7d32' : '#c62828'">{{ isCorrect ? 'check_circle' : 'cancel' }}</mat-icon>
              <strong [style.color]="isCorrect ? '#2e7d32' : '#c62828'">{{ isCorrect ? 'Correct!' : 'Incorrect' }}</strong>
            </div>
            <div *ngIf="!isCorrect" style="font-size: 0.9em; color: #666;">
              Correct answer: <strong>{{ exercise.practiceLanguageText || exercise['practice_language_text'] }}</strong>
            </div>
          </div>

          <!-- Buttons -->
          <div style="margin-top: 16px; display: flex; gap: 8px;" *ngIf="!showResult">
            <button mat-raised-button color="primary" (click)="submitAnswer()" [disabled]="!canSubmit()">
              <mat-icon>check</mat-icon> Check Answer
            </button>
            <button mat-button (click)="resetExercise()"><mat-icon>refresh</mat-icon> Reset</button>
          </div>
          <div style="margin-top: 16px; display: flex; gap: 8px;" *ngIf="showResult">
            <button mat-raised-button color="primary" (click)="nextExercise()"><mat-icon>chevron_right</mat-icon> Next Exercise</button>
            <button mat-button (click)="resetExercise()"><mat-icon>replay</mat-icon> Retry</button>
          </div>
        </mat-card-content>
      </mat-card>

      <div *ngIf="exercise" style="text-align: center; color: #888; font-size: 0.85em;">
        Attempts: {{ attempts }} · Correct: {{ correctAnswers }}
      </div>
    </div>
  `,
})
export class PracticeComponent implements OnInit {
  exercises: any[] = [];
  exercise: any = null;
  practiceMode: PracticeMode = 'arrange-words';

  availableWords: string[] = [];
  selectedWords: string[] = [];
  fillTemplate: { text: string; isBlank: boolean }[] = [];
  blankAnswers: string[] = [];

  showResult = false;
  isCorrect = false;
  correctAnswers = 0;
  attempts = 0;
  private usedIndices: number[] = [];

  constructor(private exerciseService: ExerciseService, private settingsService: SettingsService, private snackBar: MatSnackBar) {}

  async ngOnInit() {
    await this.loadExercises();
    if (this.exercises.length > 0) this.pickRandomExercise();
  }

  async loadExercises() {
    try {
      const s = this.settingsService.get();
      this.exercises = await this.exerciseService.getAll(s.practiceLanguage, s.nativeLanguage);
    } catch { /* silent */ }
  }

  pickRandomExercise() {
    if (this.exercises.length === 0) { this.exercise = null; return; }
    let remain = this.exercises.map((_, i) => i).filter(i => !this.usedIndices.includes(i));
    if (remain.length === 0) { this.usedIndices = []; remain = this.exercises.map((_, i) => i); }
    const idx = remain[Math.floor(Math.random() * remain.length)];
    this.usedIndices.push(idx);
    this.exercise = this.exercises[idx];
    this.setupExercise();
  }

  setupExercise() {
    this.showResult = false;
    const text = this.exercise.practiceLanguageText || this.exercise['practice_language_text'] || '';
    if (this.practiceMode === 'arrange-words') {
      const words = text.split(/\s+/).filter((w: string) => w.length > 0);
      this.selectedWords = [];
      this.availableWords = this.shuffle([...words]);
    } else {
      const parts = text.split(/(\s+)/);
      this.fillTemplate = [];
      this.blankAnswers = [];
      let bi = 0;
      for (const p of parts) {
        const t = p.trim();
        if (t.length === 0) { this.fillTemplate.push({ text: p, isBlank: false }); }
        else if (bi % 2 === 0) { this.fillTemplate.push({ text: p, isBlank: false }); }
        else { this.fillTemplate.push({ text: '', isBlank: true }); this.blankAnswers.push(''); }
        if (t.length > 0) bi++;
      }
    }
  }

  selectWord(w: string, i: number) { this.selectedWords.push(w); this.availableWords.splice(i, 1); }
  removeWord(i: number) { const w = this.selectedWords.splice(i, 1)[0]; this.availableWords.push(w); }
  onBlankChange(e: Event, i: number) { this.blankAnswers[i] = (e.target as HTMLInputElement).value; }

  canSubmit(): boolean {
    return this.practiceMode === 'arrange-words'
      ? this.selectedWords.length > 0 && this.availableWords.length === 0
      : this.blankAnswers.every(a => a.trim().length > 0);
  }

  async submitAnswer() {
    this.showResult = true; this.attempts++;
    const answer = this.exercise.practiceLanguageText || this.exercise['practice_language_text'] || '';
    let user = '';
    if (this.practiceMode === 'arrange-words') {
      user = this.selectedWords.join(' ');
    } else {
      let bi = 0;
      for (const p of this.fillTemplate) {
        if (p.isBlank) { user += (bi > 0 ? ' ' : '') + this.blankAnswers[bi]; bi++; }
        else { user += (user.length > 0 ? ' ' : '') + p.text.trim(); }
      }
    }
    this.isCorrect = user.toLowerCase().trim() === answer.toLowerCase().trim();
    if (this.isCorrect) this.correctAnswers++;
    try {
      await this.exerciseService.updateStats(this.exercise.id || this.exercise['id'], this.isCorrect, {
        userAnswer: user, correctAnswer: answer,
        nativeText: this.exercise.nativeLanguageText || this.exercise['native_language_text'],
        practiceMode: this.practiceMode,
      });
    } catch { /* ok */ }
  }

  resetExercise() { this.setupExercise(); }
  nextExercise() { this.pickRandomExercise(); }
  toggleMode() { this.practiceMode = this.practiceMode === 'arrange-words' ? 'fill-in-missing' : 'arrange-words'; this.setupExercise(); }

  private shuffle<T>(arr: T[]): T[] {
    for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; }
    return arr;
  }
}