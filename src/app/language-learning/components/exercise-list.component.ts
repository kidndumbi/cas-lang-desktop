import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { ExerciseService } from '../../services/exercise.service';
import { SettingsService } from '../../services/settings.service';

@Component({
  selector: 'app-exercise-list',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    MatCardModule, MatButtonModule, MatIconModule,
    MatFormFieldModule, MatInputModule, MatSelectModule, MatSnackBarModule,
  ],
  template: `
    <div style="padding: 24px;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
        <h2>Exercises ({{ exercises.length }})</h2>
        <button mat-raised-button color="primary" (click)="openCreateDialog()">+ New Exercise</button>
      </div>

      <div style="display: flex; gap: 16px; margin-bottom: 16px; flex-wrap: wrap;">
        <mat-form-field appearance="outline" style="flex: 1; min-width: 200px;">
          <mat-label>Search text</mat-label>
          <input matInput [(ngModel)]="filterText" (input)="applyFilter()" placeholder="Search...">
        </mat-form-field>
        <mat-form-field appearance="outline" style="width: 150px;">
          <mat-label>Language</mat-label>
          <mat-select [(ngModel)]="filterLanguage" (selectionChange)="applyFilter()">
            <mat-option value="">All</mat-option>
            <mat-option value="en">English</mat-option>
            <mat-option value="es">Spanish</mat-option>
            <mat-option value="fr">French</mat-option>
          </mat-select>
        </mat-form-field>
      </div>

      <mat-card *ngFor="let ex of filteredExercises" style="margin-bottom: 8px;">
        <mat-card-content style="display: flex; justify-content: space-between; align-items: center; padding: 12px 16px;">
          <div>
            <strong>{{ ex.practiceLanguageText || ex['practice_language_text'] }}</strong>
            <div style="font-size: 0.85em; color: #888;">{{ ex.nativeLanguageText || ex['native_language_text'] }}</div>
            <div style="font-size: 0.75em; color: #aaa;">
              {{ (ex.practiceLanguage || ex['practice_language']) | uppercase }}
              · {{ ex.wordCount || ex['word_count'] }} words
              · {{ ex.practiceCount || ex['practice_count'] || 0 }} practiced
            </div>
          </div>
          <div style="display: flex; gap: 8px;">
            <button mat-icon-button color="warn" (click)="deleteExercise(ex)">
              <mat-icon>delete</mat-icon>
            </button>
          </div>
        </mat-card-content>
      </mat-card>
    </div>
  `,
})
export class ExerciseListComponent implements OnInit {
  exercises: any[] = [];
  filteredExercises: any[] = [];
  filterText = '';
  filterLanguage = '';

  constructor(
    private exerciseService: ExerciseService,
    private settingsService: SettingsService,
    private snackBar: MatSnackBar,
  ) {}

  ngOnInit() {
    this.loadExercises();
  }

  async loadExercises() {
    try {
      const s = this.settingsService.get();
      this.exercises = await this.exerciseService.getAll(s.practiceLanguage, s.nativeLanguage);
      this.applyFilter();
    } catch {
      this.snackBar.open('Failed to load exercises', 'OK', { duration: 3000 });
    }
  }

  applyFilter() {
    let list = this.exercises;
    if (this.filterText) {
      const q = this.filterText.toLowerCase();
      list = list.filter(e => {
        const pt = (e.practiceLanguageText || e['practice_language_text'] || '').toLowerCase();
        const nt = (e.nativeLanguageText || e['native_language_text'] || '').toLowerCase();
        return pt.includes(q) || nt.includes(q);
      });
    }
    if (this.filterLanguage) {
      list = list.filter(e => (e.practiceLanguage || e['practice_language']) === this.filterLanguage);
    }
    this.filteredExercises = list;
  }

  async openCreateDialog() {
    const native = prompt('Native language text:');
    const practice = prompt('Practice language text:');
    if (!native || !practice) return;

    const s = this.settingsService.get();
    try {
      await this.exerciseService.create({
        videoFilePath: 'manual',
        practiceLanguageText: practice,
        nativeLanguageText: native,
        practiceLanguage: s.practiceLanguage,
        nativeLanguage: s.nativeLanguage,
        wordCount: practice.split(/\s+/).length,
        startTime: 0,
        endTime: 1,
        tags: [],
      });
      this.loadExercises();
      this.snackBar.open('Exercise created', 'OK', { duration: 2000 });
    } catch {
      this.snackBar.open('Failed to create exercise', 'OK', { duration: 3000 });
    }
  }

  async deleteExercise(ex: any) {
    const name = ex.practiceLanguageText || ex['practice_language_text'] || 'exercise';
    if (!confirm(`Delete "${name}"?`)) return;
    try {
      await this.exerciseService.delete(ex.id || ex['id']);
      this.loadExercises();
      this.snackBar.open('Deleted', 'OK', { duration: 2000 });
    } catch {
      this.snackBar.open('Failed to delete', 'OK', { duration: 3000 });
    }
  }
}