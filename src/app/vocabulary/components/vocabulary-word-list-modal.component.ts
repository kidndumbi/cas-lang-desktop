import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';

@Component({
  selector: 'app-vocabulary-word-list-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, MatCardModule, MatButtonModule, MatIconModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatCheckboxModule],
  template: `
    <div style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); z-index: 1000; display: flex; align-items: center; justify-content: center;">
      <mat-card style="width: 90%; max-width: 900px; max-height: 80vh; overflow: hidden; display: flex; flex-direction: column;">
        <mat-card-header>
          <mat-card-title style="display: flex; align-items: center; gap: 8px;">
            <mat-icon>list</mat-icon> All Words ({{ totalWords() }})
            @if (selectedIds.size > 0) {
              <span style="font-size: 0.7em; color: #3f51b5;">({{ selectedIds.size }} selected)</span>
            }
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
            <mat-form-field appearance="outline" style="width: 100px;">
              <mat-label>Per Page</mat-label>
              <input matInput type="number" [(ngModel)]="pageSizeDraft" min="5" max="500" (change)="onPageSizeChange()">
            </mat-form-field>
          </div>
          @if (uniqueTags().length > 0) {
            <div style="margin-bottom: 12px; display: flex; flex-wrap: wrap; gap: 6px;">
              @for (tag of uniqueTags(); track tag) {
                <div (click)="toggleTag.emit(tag)"
                  [style.background]="selectedTags().includes(tag) ? '#3f51b5' : '#e0e0e0'"
                  [style.color]="selectedTags().includes(tag) ? '#fff' : '#333'"
                  style="padding: 2px 10px; border-radius: 12px; font-size: 0.8em; cursor: pointer;">
                  {{ tag }}
                </div>
              }
            </div>
          }
          <!-- Toolbar: select all + delete selected -->
          @if (words().length > 0) {
            <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 8px; flex-wrap: wrap;">
              <mat-checkbox
                [checked]="isAllSelected()"
                [indeterminate]="selectedIds.size > 0 && !isAllSelected()"
                (change)="toggleAllSelected($event.checked)">
                Select All
              </mat-checkbox>
              @if (selectedIds.size > 0) {
                <button mat-raised-button color="warn" (click)="confirmMassDelete()">
                  <mat-icon>delete_sweep</mat-icon> Delete Selected ({{ selectedIds.size }})
                </button>
              }
            </div>
          }
          @for (w of words(); track w.id || $index) {
            <mat-card style="margin-bottom: 8px;">
              <mat-card-content style="display: flex; justify-content: space-between; align-items: center; padding: 8px 16px;">
                <div style="display: flex; align-items: center; gap: 12px; flex: 1; min-width: 0; cursor: pointer;" (click)="selectWord.emit(w)">
                  <mat-checkbox
                    [checked]="selectedIds.has(w.id || w['id'])"
                    (change)="toggleWord(w, $event.checked)"
                    (click)="$event.stopPropagation()"
                    style="flex-shrink: 0;">
                  </mat-checkbox>
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

          <!-- Pagination -->
          @if (totalPages() > 1) {
            <div style="display: flex; justify-content: center; align-items: center; gap: 8px; margin-top: 16px;">
              <button mat-icon-button [disabled]="currentPage() <= 1" (click)="goToFirstPage.emit()">
                <mat-icon>first_page</mat-icon>
              </button>
              <button mat-icon-button [disabled]="currentPage() <= 1" (click)="goToPreviousPage.emit()">
                <mat-icon>chevron_left</mat-icon>
              </button>
              <span style="padding: 0 12px;">{{ currentPage() }} / {{ totalPages() }}</span>
              <button mat-icon-button [disabled]="currentPage() >= totalPages()" (click)="goToNextPage.emit()">
                <mat-icon>chevron_right</mat-icon>
              </button>
              <button mat-icon-button [disabled]="currentPage() >= totalPages()" (click)="goToLastPage.emit()">
                <mat-icon>last_page</mat-icon>
              </button>
            </div>
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
  totalWords = input<number>(0);
  totalPages = input<number>(1);
  currentPage = input<number>(1);
  pageSize = input<number>(20);

  filterTextChange = output<string>();
  filterLanguageChange = output<string>();
  filterDifficultyChange = output<string>();
  filterApply = output<void>();
  selectWord = output<any>();
  editWord = output<any>();
  deleteWord = output<any>();
  massDelete = output<string[]>();
  close = output<void>();
  goToNextPage = output<void>();
  goToPreviousPage = output<void>();
  goToFirstPage = output<void>();
  goToLastPage = output<void>();
  toggleTag = output<string>();
  pageSizeChange = output<number>();

  uniqueTags = input<string[]>([]);
  selectedTags = input<string[]>([]);

  filterTextDraft = '';
  filterLanguageDraft = '';
  filterDifficultyDraft = '';
  pageSizeDraft: number;

  selectedIds = new Set<string>();

  constructor() {
    this.filterTextDraft = this.filterText();
    this.filterLanguageDraft = this.filterLanguage();
    this.filterDifficultyDraft = this.filterDifficulty();
    this.pageSizeDraft = this.pageSize();
  }

  onFilterChange(): void {
    this.filterTextChange.emit(this.filterTextDraft);
    this.filterLanguageChange.emit(this.filterLanguageDraft);
    this.filterDifficultyChange.emit(this.filterDifficultyDraft);
    this.filterApply.emit();
  }

  onPageSizeChange(): void {
    const n = parseInt(String(this.pageSizeDraft), 10);
    if (n >= 5 && n <= 500) {
      this.pageSizeChange.emit(n);
    }
  }

  isAllSelected(): boolean {
    const w = this.words();
    return w.length > 0 && w.every(item => this.selectedIds.has(item.id || item['id']));
  }

  toggleAllSelected(checked: boolean): void {
    for (const item of this.words()) {
      const id = item.id || item['id'];
      if (checked) {
        this.selectedIds.add(id);
      } else {
        this.selectedIds.delete(id);
      }
    }
  }

  toggleWord(item: any, checked: boolean): void {
    const id = item.id || item['id'];
    if (checked) {
      this.selectedIds.add(id);
    } else {
      this.selectedIds.delete(id);
    }
  }

  confirmMassDelete(): void {
    const count = this.selectedIds.size;
    if (count === 0) return;
    if (!confirm(`Delete ${count} selected word${count > 1 ? 's' : ''}?\n\nThis action cannot be undone.`)) return;
    this.massDelete.emit([...this.selectedIds]);
    this.selectedIds.clear();
  }
}