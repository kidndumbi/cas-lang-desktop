import { Component, input, output, signal, inject, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { VocabularyService } from '../../services/vocabulary.service';
import { SettingsService } from '../../services/settings.service';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-vocabulary-edit-word-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, MatCardModule, MatButtonModule, MatIconModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatProgressSpinnerModule],
  template: `
    @if (isOpen()) {
      <div style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); z-index: 1000; display: flex; align-items: center; justify-content: center;">
        <mat-card style="width: 90%; max-width: 500px;">
          <mat-card-header>
            <mat-card-title>Edit Word</mat-card-title>
            <button mat-icon-button (click)="close()" style="margin-left: auto;">
              <mat-icon>close</mat-icon>
            </button>
          </mat-card-header>
          <mat-card-content style="padding-top: 16px;">
            <mat-form-field appearance="outline" style="width: 100%; margin-bottom: 12px;">
              <mat-label>Word</mat-label>
              <input matInput [(ngModel)]="wordText" placeholder="Enter word...">
            </mat-form-field>
            <mat-form-field appearance="outline" style="width: 100%; margin-bottom: 12px;">
              <mat-label>Translation</mat-label>
              <input matInput [(ngModel)]="translationText" placeholder="Enter translation...">
            </mat-form-field>
            <mat-form-field appearance="outline" style="width: 100%; margin-bottom: 12px;">
              <mat-label>Difficulty</mat-label>
              <mat-select [(ngModel)]="difficultyText">
                <mat-option value="">None</mat-option>
                <mat-option value="easy">Easy</mat-option>
                <mat-option value="medium">Medium</mat-option>
                <mat-option value="hard">Hard</mat-option>
              </mat-select>
            </mat-form-field>
            <mat-form-field appearance="outline" style="width: 100%; margin-bottom: 12px;">
              <mat-label>Tags (comma-separated)</mat-label>
              <input matInput [(ngModel)]="tagsInput" placeholder="e.g. food, travel">
            </mat-form-field>
            <div style="display: flex; gap: 8px; justify-content: flex-end;">
              <button mat-button (click)="close()">Cancel</button>
              <button mat-raised-button color="primary" (click)="save()"
                [disabled]="!wordText.trim() || !translationText.trim() || isSaving()">
                @if (isSaving()) { <mat-spinner diameter="16" style="display: inline-block; margin-right: 4px;"></mat-spinner> }
                Save
              </button>
            </div>
          </mat-card-content>
        </mat-card>
      </div>
    }
  `,
})
export class VocabularyEditWordModalComponent {
  isOpen = input<boolean>(false);
  word = input<any>(null);

  closed = output<void>();
  saved = output<void>();

  wordText = '';
  translationText = '';
  difficultyText = '';
  tagsInput = '';
  isSaving = signal(false);

  private vocab = inject(VocabularyService);
  private settings = inject(SettingsService);
  private snackBar = inject(MatSnackBar);

  constructor() {
    effect(() => {
      const w = this.word();
      if (w) {
        this.wordText = w.word || '';
        this.translationText = w.translation || '';
        this.difficultyText = w.difficulty || '';
        this.tagsInput = (w.tags || []).filter((t: string) => !['favorite', 'review', 'ignore'].includes(t)).join(', ');
      }
    });
  }

  close(): void {
    this.closed.emit();
  }

  async save(): Promise<void> {
    const w = this.word();
    if (!w?.id) return;

    this.isSaving.set(true);
    try {
      const userTags = this.tagsInput.split(',').map(t => t.trim()).filter(t => t);
      const systemTags = (w.tags || []).filter((t: string) => ['favorite', 'review', 'ignore'].includes(t));
      const tags = [...new Set([...systemTags, ...userTags])];

      await this.vocab.update(w.id, {
        ...w,
        word: this.wordText.trim(),
        translation: this.translationText.trim(),
        difficulty: this.difficultyText || undefined,
        tags,
      });

      this.saved.emit();
      this.snackBar.open('Word updated', 'OK', { duration: 2000 });
    } catch {
      this.snackBar.open('Failed to update word', 'OK', { duration: 3000 });
    }
    this.isSaving.set(false);
  }
}