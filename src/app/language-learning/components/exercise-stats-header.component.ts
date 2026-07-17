import { Component, input, output } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-exercise-stats-header',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatButtonModule, MatIconModule, MatProgressSpinnerModule],
  template: `
    <mat-card style="margin-bottom: 16px;">
      <mat-card-content style="padding: 16px;">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <div style="display: flex; gap: 32px; flex-wrap: wrap;">
            <div style="text-align: center;">
              <div style="font-size: 1.5em; font-weight: 600;">{{ totalExercises() }}</div>
              <div style="font-size: 0.75em; color: #888;">Total</div>
            </div>
            <div style="text-align: center;">
              <div style="font-size: 1.5em; font-weight: 600;">{{ favoriteCount() }}</div>
              <div style="font-size: 0.75em; color: #888;">Favorites</div>
            </div>
            <div style="text-align: center;">
              <div style="font-size: 1.5em; font-weight: 600;">{{ sessionCorrect() }}</div>
              <div style="font-size: 0.75em; color: #888;">Correct</div>
            </div>
            <div style="text-align: center;">
              <div style="font-size: 1.5em; font-weight: 600;">{{ sessionAttempts() }}</div>
              <div style="font-size: 0.75em; color: #888;">Attempts</div>
            </div>
          </div>
          @if (loading()) {
            <mat-spinner diameter="24" style="margin-left: 16px;"></mat-spinner>
          }
        </div>
        <div style="display: flex; gap: 8px; margin-top: 12px; flex-wrap: wrap;">
          <button mat-button color="primary" (click)="openExerciseList.emit()">
            <mat-icon>list</mat-icon> All
          </button>
          <button mat-button color="primary" (click)="openTagManagement.emit()">
            <mat-icon>label</mat-icon> Tags
          </button>
          <button mat-button color="primary" (click)="openCreateExercise.emit()">
            <mat-icon>add_circle</mat-icon> Create
          </button>
        </div>
      </mat-card-content>
    </mat-card>
  `,
})
export class ExerciseStatsHeaderComponent {
  totalExercises = input.required<number>();
  favoriteCount = input<number>(0);
  sessionCorrect = input<number>(0);
  sessionAttempts = input<number>(0);
  loading = input<boolean>(false);

  openExerciseList = output<void>();
  openTagManagement = output<void>();
  openCreateExercise = output<void>();
}