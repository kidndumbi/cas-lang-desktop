import { Component, Inject, ChangeDetectorRef } from '@angular/core';
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
  refresh: () => void;
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
  isFavorite: (ex: any) => boolean;
  isMarkedForReview: (ex: any) => boolean;
}

@Component({
  selector: 'app-exercise-list-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, MatCardModule, MatButtonModule, MatIconModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatChipsModule, MatDialogModule],
  template: `
    <h2 mat-dialog-title>All Exercises ({{ data.totalExercises }})</h2>
    <mat-dialog-content>
      <mat-card style="margin-bottom: 16px;">
        <mat-card-content style="padding: 12px 16px;">
          <div style="display: flex; gap: 12px; flex-wrap: wrap; align-items: center;">
            <mat-form-field appearance="outline" style="flex: 1; min-width: 160px;">
              <mat-label>Search</mat-label>
              <input matInput [(ngModel)]="searchText" (input)="onSearchInput()" placeholder="Search...">
            </mat-form-field>
            <mat-form-field appearance="outline" style="width: 130px;">
              <mat-label>Practice Lang</mat-label>
              <mat-select [(ngModel)]="practiceLanguage" (selectionChange)="onFilterChange('practiceLanguage', practiceLanguage)">
                <mat-option value="all">All</mat-option>
                <mat-option value="en">English</mat-option>
                <mat-option value="es">Spanish</mat-option>
                <mat-option value="fr">French</mat-option>
              </mat-select>
            </mat-form-field>
            <mat-form-field appearance="outline" style="width: 130px;">
              <mat-label>Native Lang</mat-label>
              <mat-select [(ngModel)]="nativeLanguage" (selectionChange)="onFilterChange('nativeLanguage', nativeLanguage)">
                <mat-option value="all">All</mat-option>
                <mat-option value="en">English</mat-option>
                <mat-option value="es">Spanish</mat-option>
                <mat-option value="fr">French</mat-option>
              </mat-select>
            </mat-form-field>
            <mat-form-field appearance="outline" style="width: 130px;">
              <mat-label>Difficulty</mat-label>
              <mat-select [(ngModel)]="difficulty" (selectionChange)="onFilterChange('difficulty', difficulty)">
                <mat-option value="all">All</mat-option>
                <mat-option value="easy">Easy</mat-option>
                <mat-option value="medium">Medium</mat-option>
                <mat-option value="hard">Hard</mat-option>
              </mat-select>
            </mat-form-field>
            <mat-form-field appearance="outline" style="width: 170px;">
              <mat-label>Status</mat-label>
              <mat-select [(ngModel)]="practiceStatus" (selectionChange)="onFilterChange('practiceStatus', practiceStatus)">
                <mat-option value="all">All</mat-option>
                <mat-option value="never">Never Practiced</mat-option>
                <mat-option value="low-accuracy">Low Accuracy</mat-option>
                <mat-option value="high-accuracy">High Accuracy</mat-option>
                <mat-option value="favorites">Favorites</mat-option>
              </mat-select>
            </mat-form-field>
            @if (hasActiveFilters()) {
              <button mat-button color="warn" (click)="clearAll()"><mat-icon>clear</mat-icon> Clear</button>
            }
          </div>
          @if (data.uniqueTags.length > 0) {
            <div style="margin-top: 8px; display: flex; flex-wrap: wrap; gap: 6px;">
              @for (tag of data.uniqueTags; track tag) {
                <div (click)="data.onToggleTagFilter(tag); data.refresh()"
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

      @for (ex of data.paginatedExercises; track ex.id || ex['id'] || $index) {
        <div style="margin-bottom: 8px;">
          <mat-card>
            <mat-card-content style="display: flex; justify-content: space-between; align-items: center; padding: 12px 16px;">
              <div style="flex: 1; cursor: pointer; min-width: 0;" (click)="data.onSelectExercise(ex); dialogRef.close()">
                <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 2px;">
                  @if (data.isFavorite(ex)) {
                    <mat-icon style="font-size: 16px; color: #f44336; flex-shrink: 0;">star</mat-icon>
                  }
                  @if (data.isMarkedForReview(ex)) {
                    <mat-icon style="font-size: 16px; color: #3f51b5; flex-shrink: 0;">bookmark</mat-icon>
                  }
                  <strong style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">{{ ex.practiceLanguageText || ex['practice_language_text'] }}</strong>
                </div>
                <div style="font-size: 0.85em; color: #888; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">{{ ex.nativeLanguageText || ex['native_language_text'] }}</div>
                <div style="font-size: 0.7em; color: #aaa; margin-top: 2px;">
                  {{ (ex.practiceLanguage || ex['practice_language']) | uppercase }}
                  · {{ ex.wordCount || ex['word_count'] || 0 }} words
                  · {{ ex.practiceCount || 0 }} attempts
                  · {{ (ex.accuracyRate || ex['accuracy_rate'] || 0) | number:'1.0-0' }}% accuracy
                  @if (ex.difficulty) { · {{ ex.difficulty }} }
                </div>
              </div>
              <div style="display: flex; gap: 4px; flex-shrink: 0; margin-left: 8px;">
                <button mat-icon-button color="primary" (click)="data.onEditExercise(ex)" title="Edit"><mat-icon>edit</mat-icon></button>
                <button mat-icon-button color="warn" (click)="data.onDeleteExercise(ex)" title="Delete"><mat-icon>delete</mat-icon></button>
              </div>
            </mat-card-content>
          </mat-card>
        </div>
      }

      @if (data.totalPages > 1) {
        <div style="display: flex; justify-content: center; align-items: center; gap: 8px; margin-top: 16px;">
          <button mat-icon-button [disabled]="data.currentPage <= 1" (click)="data.onGoToFirstPage(); data.refresh()"><mat-icon>first_page</mat-icon></button>
          <button mat-icon-button [disabled]="data.currentPage <= 1" (click)="data.onGoToPreviousPage(); data.refresh()"><mat-icon>chevron_left</mat-icon></button>
          <span style="padding: 0 12px;">{{ data.currentPage }} / {{ data.totalPages }}</span>
          <button mat-icon-button [disabled]="data.currentPage >= data.totalPages" (click)="data.onGoToNextPage(); data.refresh()"><mat-icon>chevron_right</mat-icon></button>
          <button mat-icon-button [disabled]="data.currentPage >= data.totalPages" (click)="data.onGoToLastPage(); data.refresh()"><mat-icon>last_page</mat-icon></button>
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
  nativeLanguage = 'all';
  difficulty = 'all';
  practiceStatus = 'all';

  constructor(
    public dialogRef: MatDialogRef<ExerciseListModalComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ExerciseListModalData,
    private cdr: ChangeDetectorRef,
  ) {}

  onSearchInput() { this.data.onUpdateFilter('searchText', this.searchText); this.data.refresh(); }
  onFilterChange(key: string, value: string) { this.data.onUpdateFilter(key, value); this.data.refresh(); }

  clearAll() {
    this.searchText = ''; this.practiceLanguage = 'all'; this.nativeLanguage = 'all';
    this.difficulty = 'all'; this.practiceStatus = 'all';
    this.data.onClearFilters(); this.data.refresh();
  }

  hasActiveFilters(): boolean {
    return this.searchText.trim().length > 0 || this.practiceLanguage !== 'all' ||
      this.nativeLanguage !== 'all' || this.difficulty !== 'all' ||
      this.practiceStatus !== 'all' || this.data.selectedTags.length > 0;
  }
}
