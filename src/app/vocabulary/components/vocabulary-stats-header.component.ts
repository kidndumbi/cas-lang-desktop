import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-vocabulary-stats-header',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatButtonModule, MatIconModule],
  template: `
    <mat-card style="margin-bottom: 16px;">
      <mat-card-content style="display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; flex-wrap: wrap; gap: 12px;">
        <div style="display: flex; gap: 12px; align-items: center; flex-wrap: wrap;">
          <span style="font-weight: 500;">{{ totalWords() }} words</span>
          <span style="color: #f44336; font-size: 0.9em;">
            <mat-icon style="font-size: 16px; vertical-align: middle;">star</mat-icon> {{ favoriteCount() }}
          </span>
          <span style="font-size: 0.9em; color: #888;">
            Session: {{ sessionCorrect() }}/{{ sessionAttempts() }} ({{ sessionAccuracy() }}%)
          </span>
        </div>
        <div style="display: flex; gap: 8px;">
          <button mat-stroked-button (click)="openWordList.emit()">
            <mat-icon>list</mat-icon> All Words
          </button>
          <button mat-stroked-button color="primary" (click)="createWord.emit()">
            <mat-icon>add</mat-icon> Add Word
          </button>
        </div>
      </mat-card-content>
    </mat-card>
  `,
})
export class VocabularyStatsHeaderComponent {
  totalWords = input<number>(0);
  favoriteCount = input<number>(0);
  sessionCorrect = input<number>(0);
  sessionAttempts = input<number>(0);
  sessionAccuracy = input<number>(0);

  openWordList = output<void>();
  createWord = output<void>();
}