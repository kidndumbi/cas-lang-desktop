import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';

@Component({
  selector: 'app-vocabulary-word-list-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, MatCardModule, MatButtonModule, MatIconModule, MatFormFieldModule, MatInputModule, MatSelectModule],
  template: `
    <div style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); z-index: 1000; display: flex; align-items: center; justify-content: center;">
      <mat-card style="width: 90%; max-width: 900px; max-height: 80vh; overflow: hidden; display: flex; flex-direction: column;">
        <mat-card-header>
          <mat-card-title style="display: flex; align-items: center; gap: 8px;">
            <mat-icon>list</mat-icon> All Words ({{ words().length }})
          </mat-card-title>
          <button mat-icon-button (click)="close.emit()" style="margin-left: auto;">
            <mat-icon>close</mat-icon>
          </button>
        </mat-card-header>
        <mat-card-content style="overflow-y: auto; flex: 1;">
          <div style="display: flex; gap: 12px; margin-bottom: 16px; flex-wrap: wrap;">
            <mat-form-field appearance="outline" style="flex: 1; min-width: 200px;">
              <mat-label>Search</mat-label>
              <input matInput [(ngModel)]="filterTextDraft" (input)="onFilterChange()" placeholder="Search word or translation...">
            </mat-form-field>
            <mat-form-field appearance="outline" style="width: 130px;">
              <mat-label>Language</mat-label>
              <mat-select [(ngModel)]="filterLanguageDraft" (selectionChange)="onFilterChange()">
                <mat-option value="">All</mat-option>
                <mat-option value="en">English</mat-option>
                <mat-option value="es">Spanish</mat-option>
                <mat-option value="fr">French</mat-option>
              </mat-select>
            </mat-form-field>
            <mat-form-field appearance="outline" style="width: 130px;">
              <mat-label>Difficulty</mat-label>
              <mat-select [(ngModel)]="filterDifficultyDraft" (selectionChange)="onFilterChange()">
                <mat-option value="">All</mat-option>
                <mat-option value="easy">Easy</mat-option>
                <mat-option value="medium">Medium</mat-option>
                <mat-option value="hard">Hard</mat-option>
              </mat-select>
            </mat-form-field>
          </div>
          @for (w of words(); track w.id || $index) {
            <mat-card style="margin-bottom: 8px; cursor: pointer;" (click)="selectWord.emit(w)">
              <mat-card-content style="display: flex; justify-content: space-between; align-items: center; padding: 12px 16px;">
                <div style="flex: 1; min-width: 0;">
                  <div style="display: flex; align-items: center; gap: 8px;">
                    @if (w.tags?.includes('favorite')) {
                      <mat-icon style="font-size: 16px; color: #f44336;">star</mat-icon>
                    }
                    <strong style="font-size: 1.05em;">{{ w.word }}</strong>
                    <mat-icon style="font-size: 16px; color: #999;">arrow_forward</mat-icon>
                    <em style="font-size: 1.05em;">{{ w.translation }}</em>
                  </div>
                  <div style="font-size: 0.75em; color: #aaa; margin-top: 4px;">
                    {{ (w.practiceLanguage || '') | uppercase }}
                    · {{ w.difficulty || 'unrated' }}
                    · {{ w.practiceCount || 0 }}× practiced
                    · {{ (w.accuracyRate || 0) | number:'1.0-0' }}%
                    @if (w.tags?.length) { <span> · {{ w.tags.join(', ') }}</span> }
                  </div>
                </div>
                <div style="display: flex; gap: 4px; flex-shrink: 0;">
                  <button mat-icon-button color="primary" (click)="$event.stopPropagation(); editWord.emit(w)" title="Edit">
                    <mat-icon>edit</mat-icon>
                  </button>
                  <button mat-icon-button color="warn" (click)="$event.stopPropagation(); deleteWord.emit(w)" title="Delete">
                    <mat-icon>delete</mat-icon>
                  </button>
                </div>
              </mat-card-content>
            </mat-card>
          }
        </mat-card-content>
      </mat-card>
    </div>
  `,
})
export class VocabularyWordListModalComponent {
  words = input<any[]>([]);
  filterText = input<string>('');
  filterLanguage = input<string>('');
  filterDifficulty = input<string>('');

  filterTextChange = output<string>();
  filterLanguageChange = output<string>();
  filterDifficultyChange = output<string>();
  filterApply = output<void>();
  selectWord = output<any>();
  editWord = output<any>();
  deleteWord = output<any>();
  close = output<void>();

  filterTextDraft = '';
  filterLanguageDraft = '';
  filterDifficultyDraft = '';

  constructor() {
    // Sync initial values
    this.filterTextDraft = this.filterText();
    this.filterLanguageDraft = this.filterLanguage();
    this.filterDifficultyDraft = this.filterDifficulty();
  }

  onFilterChange(): void {
    this.filterTextChange.emit(this.filterTextDraft);
    this.filterLanguageChange.emit(this.filterLanguageDraft);
    this.filterDifficultyChange.emit(this.filterDifficultyDraft);
    this.filterApply.emit();
  }
}