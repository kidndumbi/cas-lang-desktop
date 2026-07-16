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
import { VocabularyService } from '../../services/vocabulary.service';
import { SettingsService } from '../../services/settings.service';

@Component({
  selector: 'app-vocabulary-list',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    MatCardModule, MatButtonModule, MatIconModule,
    MatFormFieldModule, MatInputModule, MatSelectModule, MatSnackBarModule,
  ],
  template: `
    <div style="padding: 24px;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
        <h2>Vocabulary ({{ words.length }})</h2>
        <button mat-raised-button color="primary" (click)="openCreateDialog()">+ New Word</button>
      </div>

      <div style="display: flex; gap: 16px; margin-bottom: 16px; flex-wrap: wrap;">
        <mat-form-field appearance="outline" style="flex: 1; min-width: 200px;">
          <mat-label>Search</mat-label>
          <input matInput [(ngModel)]="filterText" (input)="applyFilter()" placeholder="Search word or translation...">
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
        <mat-form-field appearance="outline" style="width: 150px;">
          <mat-label>Difficulty</mat-label>
          <mat-select [(ngModel)]="filterDifficulty" (selectionChange)="applyFilter()">
            <mat-option value="">All</mat-option>
            <mat-option value="easy">Easy</mat-option>
            <mat-option value="medium">Medium</mat-option>
            <mat-option value="hard">Hard</mat-option>
          </mat-select>
        </mat-form-field>
      </div>

      <mat-card *ngFor="let word of filteredWords" style="margin-bottom: 8px;">
        <mat-card-content style="display: flex; justify-content: space-between; align-items: center; padding: 12px 16px;">
          <div>
            <strong>{{ word.word }}</strong> → <em>{{ word.translation }}</em>
            <div style="font-size: 0.75em; color: #aaa;">
              {{ word.practiceLanguage || word['practice_language'] | uppercase }}
              · {{ word.difficulty || 'unrated' }}
              · practiced {{ word.practiceCount || word['practice_count'] || 0 }}×
              <span *ngIf="word.tags?.length"> · {{ word.tags.join(', ') }}</span>
            </div>
          </div>
          <div style="display: flex; gap: 8px;">
            <button mat-icon-button color="warn" (click)="deleteWord(word)">
              <mat-icon>delete</mat-icon>
            </button>
          </div>
        </mat-card-content>
      </mat-card>
    </div>
  `,
})
export class VocabularyListComponent implements OnInit {
  words: any[] = [];
  filteredWords: any[] = [];
  filterText = '';
  filterLanguage = '';
  filterDifficulty = '';

  constructor(
    private vocabularyService: VocabularyService,
    private settingsService: SettingsService,
    private snackBar: MatSnackBar,
  ) {}

  ngOnInit() {
    this.loadWords();
  }

  async loadWords() {
    try {
      const s = this.settingsService.get();
      this.words = await this.vocabularyService.getAll(s.practiceLanguage, s.nativeLanguage);
      this.applyFilter();
    } catch {
      this.snackBar.open('Failed to load vocabulary', 'OK', { duration: 3000 });
    }
  }

  applyFilter() {
    let list = this.words;
    if (this.filterText) {
      const q = this.filterText.toLowerCase();
      list = list.filter((w: any) =>
        (w.word || '').toLowerCase().includes(q) || (w.translation || '').toLowerCase().includes(q)
      );
    }
    if (this.filterLanguage) {
      list = list.filter((w: any) => w.practiceLanguage === this.filterLanguage);
    }
    if (this.filterDifficulty) {
      list = list.filter((w: any) => w.difficulty === this.filterDifficulty);
    }
    this.filteredWords = list;
  }

  async openCreateDialog() {
    const word = prompt('Word:');
    const translation = prompt('Translation:');
    if (!word || !translation) return;

    const s = this.settingsService.get();
    try {
      await this.vocabularyService.create({
        word,
        translation,
        practiceLanguage: s.practiceLanguage,
        nativeLanguage: s.nativeLanguage,
        tags: [],
      });
      this.loadWords();
      this.snackBar.open('Word created', 'OK', { duration: 2000 });
    } catch {
      this.snackBar.open('Failed to create word', 'OK', { duration: 3000 });
    }
  }

  async deleteWord(word: any) {
    if (!confirm(`Delete "${word.word}"?`)) return;
    try {
      await this.vocabularyService.delete(word.id);
      this.loadWords();
      this.snackBar.open('Deleted', 'OK', { duration: 2000 });
    } catch {
      this.snackBar.open('Failed to delete', 'OK', { duration: 3000 });
    }
  }
}