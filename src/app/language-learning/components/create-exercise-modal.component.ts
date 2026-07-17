import { Component, Inject, signal } from '@angular/core';
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
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';

export interface CreateExerciseModalData {
  allTags: string[];
  isSaving: boolean;
  error: string;
  onSaved: (data: any) => void;
}

@Component({
  selector: 'app-create-exercise-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, MatCardModule, MatButtonModule, MatIconModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatChipsModule, MatProgressSpinnerModule, MatDialogModule],
  template: `
    <h2 mat-dialog-title style="display: flex; align-items: center; gap: 8px;">
      <mat-icon>add_circle</mat-icon> Create New Exercise
    </h2>
    <mat-dialog-content>
      <!-- Error -->
      @if (data.error) {
        <mat-card color="warn" style="margin-bottom: 16px; background: #fbe9e7;">
          <mat-card-content><p style="color: #c62828; margin: 0;">{{ data.error }}</p></mat-card-content>
        </mat-card>
      }

      <!-- Form Fields -->
      <mat-form-field appearance="outline" style="width: 100%; margin-bottom: 12px;">
        <mat-label>Practice Language Text</mat-label>
        <textarea matInput [(ngModel)]="practiceText" rows="2" placeholder="The sentence in the language you're learning..."></textarea>
      </mat-form-field>

      <mat-form-field appearance="outline" style="width: 100%; margin-bottom: 12px;">
        <mat-label>Native Language Text</mat-label>
        <textarea matInput [(ngModel)]="nativeText" rows="2" placeholder="Translation in your native language..."></textarea>
      </mat-form-field>

      <div style="display: flex; gap: 12px; margin-bottom: 12px;">
        <mat-form-field appearance="outline" style="flex: 1;">
          <mat-label>Practice Language</mat-label>
          <mat-select [(ngModel)]="practiceLanguage">
            @for (l of languages(); track l) {
              <mat-option [value]="l">{{ l | uppercase }}</mat-option>
            }
          </mat-select>
        </mat-form-field>
        <mat-form-field appearance="outline" style="flex: 1;">
          <mat-label>Native Language</mat-label>
          <mat-select [(ngModel)]="nativeLanguage">
            @for (l of languages(); track l) {
              <mat-option [value]="l">{{ l | uppercase }}</mat-option>
            }
          </mat-select>
        </mat-form-field>
      </div>

      <mat-form-field appearance="outline" style="width: 100%; margin-bottom: 12px;">
        <mat-label>Difficulty</mat-label>
        <mat-select [(ngModel)]="difficulty">
          <mat-option value="">None</mat-option>
          <mat-option value="easy">Easy</mat-option>
          <mat-option value="medium">Medium</mat-option>
          <mat-option value="hard">Hard</mat-option>
        </mat-select>
      </mat-form-field>

      <!-- Tags input -->
      <mat-form-field appearance="outline" style="width: 100%; margin-bottom: 12px;">
        <mat-label>Tags (comma-separated)</mat-label>
        <input matInput [(ngModel)]="tagsInput" placeholder="e.g. food, travel, beginner">
      </mat-form-field>

      <!-- Available tags chips -->
      @if (data.allTags.length > 0) {
        <div style="margin-bottom: 12px; display: flex; flex-wrap: wrap; gap: 6px;">
          @for (tag of data.allTags; track tag) {
            <div
              (click)="addTag(tag)"
              style="padding: 2px 10px; border-radius: 12px; font-size: 0.8em; cursor: pointer; background: #e3f2fd;">
              <mat-icon style="font-size: 14px; margin-right: 2px; vertical-align: middle;">add</mat-icon>{{ tag }}
            </div>
          }
        </div>
      }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button (click)="dialogRef.close()">Cancel</button>
      <button mat-raised-button color="primary" (click)="save()"
        [disabled]="!practiceText.trim() || !nativeText.trim() || !practiceLanguage || !nativeLanguage || data.isSaving">
        @if (data.isSaving) { <mat-spinner diameter="20" style="display: inline-block; margin-right: 8px;"></mat-spinner> }
        Create Exercise
      </button>
    </mat-dialog-actions>
  `,
})
export class CreateExerciseModalComponent {
  practiceText = '';
  nativeText = '';
  practiceLanguage = '';
  nativeLanguage = '';
  difficulty = '';
  tagsInput = '';
  languages = signal<string[]>(['en', 'es', 'fr']);

  constructor(
    public dialogRef: MatDialogRef<CreateExerciseModalComponent>,
    @Inject(MAT_DIALOG_DATA) public data: CreateExerciseModalData,
  ) {}

  addTag(tag: string) {
    const tags = this.tagsInput.split(',').map(t => t.trim()).filter(t => t);
    if (!tags.includes(tag)) {
      tags.push(tag);
      this.tagsInput = tags.join(', ');
    }
  }

  save() {
    const tags = this.tagsInput.split(',').map(t => t.trim()).filter(t => t);
    const wordCount = this.practiceText.trim().split(/\s+/).filter(w => w.length > 0).length;
    const exerciseData = {
      videoFilePath: 'manual',
      practiceLanguageText: this.practiceText.trim(),
      nativeLanguageText: this.nativeText.trim(),
      practiceLanguage: this.practiceLanguage,
      nativeLanguage: this.nativeLanguage,
      difficulty: this.difficulty || undefined,
      wordCount,
      startTime: 0,
      endTime: 1,
      tags,
    };
    this.data.onSaved(exerciseData);
  }
}