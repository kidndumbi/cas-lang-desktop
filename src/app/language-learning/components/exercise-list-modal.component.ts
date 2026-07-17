import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';

export interface ExerciseListModalData {
  totalExercises: number;
  paginatedExercises: any[];
  totalPages: number;
  currentPage: number;
  uniqueTags: string[];
  selectedTags: string[];
  onSelectExercise: (ex: any) => void;
  onEditExercise: (ex: any) => void;
  onDeleteExercise: (ex: any) => void;
  onUpdateFilter: (key: string, value: string) => void;
  onClearFilters: () => void;
  onToggleTagFilter: (tag: string) => void;
  onGoToNextPage: () => void;
  onGoToPreviousPage: () => void;
  onGoToFirstPage: () => void;
  onGoToLastPage: () => void;
}

@Component({
  selector: 'app-exercise-list-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, MatCardModule, MatButtonModule, MatIconModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatChipsModule, MatDialogModule],
  template: `
    <h2 mat-dialog-title>All Exercises ({{ data.totalExercises }})</h2>
    <mat-dialog-content>
      <!-- Filters -->
      <mat-card style="margin-bottom: 16px;">
        <mat-card-content style="padding: 12px 16px;">
          <div style="display: flex; gap: 12px; flex-wrap: wrap; align-items: center;">
            <mat-form-field appearance="outline" style="flex: 1; min-width: 180px;">
              <mat-label>Search</mat-label>
              <input matInput [(ngModel)]="searchText" (input)="data.onUpdateFilter('searchText', searchText)" placeholder="Search...">
            </mat-form-field>
            <mat-form-field appearance="outline" style="width: 140px;">
              <mat-label>Language</mat-label>
              <mat-select [(ngModel)]="practiceLanguage" (selectionChange)="data.onUpdateFilter('practiceLanguage', practiceLanguage)">
                <mat-option value="all">All</mat-option>
                <mat-option value="en">English</mat-option>
                <mat-option value="es">Spanish</mat-option>
                <mat-option value="fr">French</mat-option>
              </mat-select>
            </mat-form-field>
            <mat-form-field appearance="outline" style="width: 140px;">
              <mat-label>Difficulty</mat-label>
              <mat-select [(ngModel)]="difficulty" (selectionChange)="data.onUpdateFilter('difficulty', difficulty)">
                <mat-option value="all">All</mat-option>
                <mat-option value="easy">Easy</mat-option>
                <mat-option value="medium">Medium</mat-option>
                <mat-option value="hard">Hard</mat-option>
              </mat-select>
            </mat-form-field>
            @if (hasActiveFilters()) {
              <button mat-button color="warn" (click)="data.onClearFilters()">
                <mat-icon>clear</mat-icon> Clear
              </button>
            }
          </div>
          <!-- Tag filters -->
          @if (data.uniqueTags.length > 0) {
            <div style="margin-top: 8px; display: flex; flex-wrap: wrap; gap: 6px;">
              @for (tag of data.uniqueTags; track tag) {
                <div
                  (click)="data.onToggleTagFilter(tag)"
                  [style.background]="data.selectedTags.includes(tag) ? '#3f51b5' : '#e0e0e0'"
                  [style.color]="data.selectedTags.includes(tag) ? '#fff' : '#333'"
                  style="padding: 2px 10px; border-radius: 12px; font-size: 0.8em; cursor: pointer;">
                  {{ tag }}
                </div>
              }
            </div>
          }
        </mat-card-content>
      </mat-card>

      <!-- Exercise list -->
      @for (ex of data.paginatedExercises; track ex.id || ex['id'] || $index) {
        <div style="margin-bottom: 8px;">
          <mat-card>
            <mat-card-content style="display: flex; justify-content: space-between; align-items: center; padding: 12px 16px;">
              <div style="flex: 1; cursor: pointer;" (click)="data.onSelectExercise(ex); dialogRef.close()">
                <strong>{{ ex.practiceLanguageText || ex['practice_language_text'] }}</strong>
                <div style="font-size: 0.85em; color: #888;">{{ ex.nativeLanguageText || ex['native_language_text'] }}</div>
                <div style="font-size: 0.7em; color: #aaa;">
                  {{ (ex.practiceLanguage || ex['practice_language']) | uppercase }}
                  · {{ ex.wordCount || ex['word_count'] }} words
                  · {{ (ex.accuracyRate || ex['accuracy_rate'] || 0) | number:'1.0-0' }}%
                </div>
              </div>
              <div style="display: flex; gap: 4px;">
                <button mat-icon-button color="primary" (click)="data.onEditExercise(ex)"><mat-icon>edit</mat-icon></button>
                <button mat-icon-button color="warn" (click)="data.onDeleteExercise(ex)"><mat-icon>delete</mat-icon></button>
              </div>
            </mat-card-content>
          </mat-card>
        </div>
      }

      <!-- Pagination -->
      @if (data.totalPages > 1) {
        <div style="display: flex; justify-content: center; gap: 8px; margin-top: 16px;">
          <button mat-icon-button [disabled]="data.currentPage <= 1" (click)="data.onGoToFirstPage()"><mat-icon>first_page</mat-icon></button>
          <button mat-icon-button [disabled]="data.currentPage <= 1" (click)="data.onGoToPreviousPage()"><mat-icon>chevron_left</mat-icon></button>
          <span style="display: flex; align-items: center; padding: 0 12px;">{{ data.currentPage }} / {{ data.totalPages }}</span>
          <button mat-icon-button [disabled]="data.currentPage >= data.totalPages" (click)="data.onGoToNextPage()"><mat-icon>chevron_right</mat-icon></button>
          <button mat-icon-button [disabled]="data.currentPage >= data.totalPages" (click)="data.onGoToLastPage()"><mat-icon>last_page</mat-icon></button>
        </div>
      }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button (click)="dialogRef.close()">Close</button>
    </mat-dialog-actions>
  `,
})
export class ExerciseListModalComponent {
  searchText = '';
  practiceLanguage = 'all';
  difficulty = 'all';

  constructor(
    public dialogRef: MatDialogRef<ExerciseListModalComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ExerciseListModalData,
  ) {}

  hasActiveFilters(): boolean {
    return this.searchText.trim().length > 0 || this.practiceLanguage !== 'all' || this.difficulty !== 'all' || this.data.selectedTags.length > 0;
  }
}