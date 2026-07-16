import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatChipsModule } from '@angular/material/chips';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { VocabularyService } from '../services/vocabulary.service';
import { SettingsService } from '../services/settings.service';

@Component({
  selector: 'app-vocabulary-page',
  standalone: true,
  imports: [CommonModule, FormsModule, MatCardModule, MatButtonModule, MatIconModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatChipsModule, MatSnackBarModule],
  template: `
    <div style="padding: 24px; max-width: 1000px; margin: 0 auto;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
        <h2>Vocabulary ({{ words.length }})</h2>
        <button mat-raised-button color="primary" (click)="createWord()">+ Add Word</button>
      </div>

      <div style="display: flex; gap: 16px; margin-bottom: 16px; flex-wrap: wrap;">
        <mat-form-field appearance="outline" style="flex: 1; min-width: 200px;">
          <mat-label>Search</mat-label>
          <input matInput [(ngModel)]="filterText" (input)="applyFilter()" placeholder="Search word or translation...">
        </mat-form-field>
        <mat-form-field appearance="outline" style="width: 140px;">
          <mat-label>Language</mat-label>
          <mat-select [(ngModel)]="filterLanguage" (selectionChange)="applyFilter()">
            <mat-option value="">All</mat-option>
            <mat-option value="en">English</mat-option>
            <mat-option value="es">Spanish</mat-option>
            <mat-option value="fr">French</mat-option>
          </mat-select>
        </mat-form-field>
        <mat-form-field appearance="outline" style="width: 140px;">
          <mat-label>Difficulty</mat-label>
          <mat-select [(ngModel)]="filterDifficulty" (selectionChange)="applyFilter()">
            <mat-option value="">All</mat-option>
            <mat-option value="easy">Easy</mat-option>
            <mat-option value="medium">Medium</mat-option>
            <mat-option value="hard">Hard</mat-option>
          </mat-select>
        </mat-form-field>
      </div>

      <mat-card *ngFor="let w of filteredWords" style="margin-bottom: 8px;">
        <mat-card-content style="display: flex; justify-content: space-between; align-items: center; padding: 12px 16px;">
          <div style="flex: 1;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <strong style="font-size: 1.1em;">{{ w.word }}</strong>
              <mat-icon style="font-size: 16px; color: #999;">arrow_forward</mat-icon>
              <em style="font-size: 1.1em;">{{ w.translation }}</em>
            </div>
            <div style="font-size: 0.75em; color: #aaa; margin-top: 4px;">
              {{ (w.practiceLanguage || w['practice_language']) | uppercase }}
              · {{ w.difficulty || 'unrated' }}
              · {{ w.practiceCount || w['practice_count'] || 0 }}× practiced
              · {{ (w.accuracyRate || w['accuracy_rate'] || 0) | number:'1.0-0' }}%
              <span *ngIf="w.tags?.length"> · {{ w.tags.join(', ') }}</span>
            </div>
          </div>
          <button mat-icon-button color="warn" (click)="deleteWord(w)"><mat-icon>delete</mat-icon></button>
        </mat-card-content>
      </mat-card>
    </div>
  `,
})
export class VocabularyPageComponent implements OnInit {
  words: any[] = [];
  filteredWords: any[] = [];
  filterText = ''; filterLanguage = ''; filterDifficulty = '';

  constructor(private vocab: VocabularyService, private settings: SettingsService, private snackBar: MatSnackBar) {}

  async ngOnInit() { await this.load(); }

  async load() {
    try { const s = this.settings.get(); this.words = await this.vocab.getAll(s.practiceLanguage, s.nativeLanguage); this.applyFilter(); }
    catch { this.snackBar.open('Failed to load vocabulary', 'OK', { duration: 3000 }); }
  }

  applyFilter() {
    let list = this.words;
    if (this.filterText) { const q = this.filterText.toLowerCase(); list = list.filter(w => (w.word||'').toLowerCase().includes(q) || (w.translation||'').toLowerCase().includes(q)); }
    if (this.filterLanguage) list = list.filter(w => (w.practiceLanguage || w['practice_language']) === this.filterLanguage);
    if (this.filterDifficulty) list = list.filter(w => w.difficulty === this.filterDifficulty);
    this.filteredWords = list;
  }

  async createWord() {
    const word = prompt('Word:'), translation = prompt('Translation:');
    if (!word || !translation) return;
    const s = this.settings.get();
    try { await this.vocab.create({ word, translation, practiceLanguage: s.practiceLanguage, nativeLanguage: s.nativeLanguage, tags: [] }); this.load(); this.snackBar.open('Created', 'OK', { duration: 2000 }); }
    catch { this.snackBar.open('Failed', 'OK', { duration: 3000 }); }
  }

  async deleteWord(w: any) { if (!confirm(`Delete "${w.word}"?`)) return; try { await this.vocab.delete(w.id || w['id']); this.load(); this.snackBar.open('Deleted', 'OK', { duration: 2000 }); } catch { this.snackBar.open('Failed', 'OK', { duration: 3000 }); } }
}