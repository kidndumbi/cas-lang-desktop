import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

@Component({
  selector: 'app-exercise-list-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, MatCardModule, MatButtonModule, MatIconModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatChipsModule, MatProgressSpinnerModule],
  template: `
    <div style="padding: 24px; max-width: 900px; margin: 0 auto;">
      <h2>All Exercises ({{ totalExercises() }})</h2>

      <!-- Filters -->
      <mat-card style="margin-bottom: 16px;">
        <mat-card-content style="padding: 12px 16px;">
          <div style="display: flex; gap: 12px; flex-wrap: wrap; align-items: center;">
            <mat-form-field appearance="outline" style="flex: 1; min-width: 180px;">
              <mat-label>Search</mat-label>
              <input matInput [(ngModel)]="searchText" (input)="updateFilter.emit({key:'searchText', value: searchText})" placeholder="Search...">
            </mat-form-field>
            <mat-form-field appearance="outline" style="width: 140px;">
              <mat-label>Language</mat-label>
              <mat-select [(ngModel)]="practiceLanguage" (selectionChange)="updateFilter.emit({key:'practiceLanguage', value: practiceLanguage})">
                <mat-option value="all">All</mat-option>
                <mat-option value="en">English</mat-option>
                <mat-option value="es">Spanish</mat-option>
                <mat-option value="fr">French</mat-option>
              </mat-select>
            </mat-form-field>
            <mat-form-field appearance="outline" style="width: 140px;">
              <mat-label>Difficulty</mat-label>
              <mat-select [(ngModel)]="difficulty" (selectionChange)="updateFilter.emit({key:'difficulty', value: difficulty})">
                <mat-option value="all">All</mat-option>
                <mat-option value="easy">Easy</mat-option>
                <mat-option value="medium">Medium</mat-option>
                <mat-option value="hard">Hard</mat-option>
              </mat-select>
            </mat-form-field>
            @if (hasActiveFilters()) {
              <button mat-button color="warn" (click)="clearFilters.emit()">
                <mat-icon>clear</mat-icon> Clear
              </button>
            }
          </div>
          <!-- Tag filters -->
          <div *ngIf="uniqueTags().length > 0" style="margin-top: 8px; display: flex; flex-wrap: wrap; gap: 6px;">
            <div *ngFor="let tag of uniqueTags()"
              (click)="toggleTagFilter.emit(tag)"
              [style.background]="selectedTags().includes(tag) ? '#3f51b5' : '#e0e0e0'"
              [style.color]="selectedTags().includes(tag) ? '#fff' : '#333'"
              style="padding: 2px 10px; border-radius: 12px; font-size: 0.8em; cursor: pointer;">
              {{ tag }}
            </div>
          </div>
        </mat-card-content>
      </mat-card>

      <!-- Exercise list -->
      <div *ngFor="let ex of paginatedExercises()" style="margin-bottom: 8px;">
        <mat-card>
          <mat-card-content style="display: flex; justify-content: space-between; align-items: center; padding: 12px 16px;">
            <div style="flex: 1; cursor: pointer;" (click)="selectExercise.emit(ex)">
              <strong>{{ ex.practiceLanguageText || ex['practice_language_text'] }}</strong>
              <div style="font-size: 0.85em; color: #888;">{{ ex.nativeLanguageText || ex['native_language_text'] }}</div>
              <div style="font-size: 0.7em; color: #aaa;">
                {{ (ex.practiceLanguage || ex['practice_language']) | uppercase }}
                · {{ ex.wordCount || ex['word_count'] }} words
                · {{ (ex.accuracyRate || ex['accuracy_rate'] || 0) | number:'1.0-0' }}%
              </div>
            </div>
            <div style="display: flex; gap: 4px;">
              <button mat-icon-button color="primary" (click)="editExercise.emit(ex)"><mat-icon>edit</mat-icon></button>
              <button mat-icon-button color="warn" (click)="deleteExercise.emit(ex)"><mat-icon>delete</mat-icon></button>
            </div>
          </mat-card-content>
        </mat-card>
      </div>

      <!-- Pagination -->
      <div *ngIf="totalPages() > 1" style="display: flex; justify-content: center; gap: 8px; margin-top: 16px;">
        <button mat-icon-button [disabled]="currentPage() <= 1" (click)="goToFirstPage.emit()"><mat-icon>first_page</mat-icon></button>
        <button mat-icon-button [disabled]="currentPage() <= 1" (click)="goToPreviousPage.emit()"><mat-icon>chevron_left</mat-icon></button>
        <span style="display: flex; align-items: center; padding: 0 12px;">{{ currentPage() }} / {{ totalPages() }}</span>
        <button mat-icon-button [disabled]="currentPage() >= totalPages()" (click)="goToNextPage.emit()"><mat-icon>chevron_right</mat-icon></button>
        <button mat-icon-button [disabled]="currentPage() >= totalPages()" (click)="goToLastPage.emit()"><mat-icon>last_page</mat-icon></button>
      </div>
    </div>
  `,
})
export class ExerciseListModalComponent {
  totalExercises = input.required<number>();
  paginatedExercises = input.required<any[]>();
  totalPages = input<number>(1);
  currentPage = input<number>(1);
  uniqueTags = input<string[]>([]);
  selectedTags = input<string[]>([]);

  searchText = '';
  practiceLanguage = 'all';
  difficulty = 'all';

  selectExercise = output<any>();
  editExercise = output<any>();
  deleteExercise = output<any>();
  updateFilter = output<{ key: string; value: string }>();
  clearFilters = output<void>();
  toggleTagFilter = output<string>();
  goToNextPage = output<void>();
  goToPreviousPage = output<void>();
  goToFirstPage = output<void>();
  goToLastPage = output<void>();
  closed = output<void>();

  hasActiveFilters(): boolean {
    return this.searchText.trim().length > 0 || this.practiceLanguage !== 'all' || this.difficulty !== 'all' || this.selectedTags().length > 0;
  }
}