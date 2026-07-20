import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatChipsModule } from '@angular/material/chips';
import { MatTableModule } from '@angular/material/table';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';

export interface VerbTaggingModalData {
  progress: VerbTaggingProgress | null;
  onStop: () => void;
}

export interface VerbTaggingProgress {
  status: 'idle' | 'running' | 'completed' | 'stopping' | 'error';
  current: number;
  total: number;
  updatedWords: Array<{ word: string; translation: string; id: string }>;
  createdWords: Array<{ word: string; translation: string }>;
  error?: string;
}

@Component({
  selector: 'app-verb-tagging-modal',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule, MatProgressBarModule, MatChipsModule, MatTableModule, MatDialogModule],
  template: `
    <h2 mat-dialog-title style="display: flex; align-items: center; justify-content: space-between;">
      Verb Tagging Progress
      <button mat-icon-button (click)="close()" style="margin-left: auto;">
        <mat-icon>close</mat-icon>
      </button>
    </h2>
    <mat-dialog-content>
      @if (!data || !data.progress) {
        <p style="color: #888;">Loading progress...</p>
      }
      @else {
        <div style="display: flex; flex-direction: column; gap: 16px; margin-top: 8px;">

          <!-- Status chip -->
          <div style="display: flex; align-items: center; gap: 8px;">
            <span
              [style.background]="
                data.progress.status === 'running' ? '#1976d2' :
                data.progress.status === 'completed' ? '#2e7d32' :
                data.progress.status === 'stopping' ? '#ed6c02' :
                data.progress.status === 'error' ? '#d32f2f' : '#757575'
              "
              style="color: white; padding: 2px 12px; border-radius: 16px; font-size: 0.8em; font-weight: 500;">
              {{
                data.progress.status === 'running' ? 'Running' :
                data.progress.status === 'completed' ? 'Completed' :
                data.progress.status === 'stopping' ? 'Stopped' :
                data.progress.status === 'error' ? 'Error' : 'Idle'
              }}
            </span>
            @if (data.progress.status === 'error' && data.progress.error) {
              <span style="color: #d32f2f; font-size: 0.85em;">{{ data.progress.error }}</span>
            }
          </div>

          <!-- Progress bar -->
          <div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 4px; font-size: 0.85em;">
              <span>{{ data.progress.current }} / {{ data.progress.total }}</span>
              <span>{{ getPercent() }}%</span>
            </div>
            <mat-progress-bar
              mode="determinate"
              [value]="getPercent()"
              style="height: 8px; border-radius: 4px;">
            </mat-progress-bar>
          </div>

          <!-- Updated Words table -->
          @if (data.progress.updatedWords && data.progress.updatedWords.length > 0) {
            <div>
              <div style="font-weight: 600; margin-bottom: 8px; font-size: 0.9em;">
                Updated Words ({{ data.progress.updatedWords.length }})
              </div>
              <div style="max-height: 200px; overflow-y: auto; border: 1px solid #e0e0e0; border-radius: 4px;">
                <table style="width: 100%; border-collapse: collapse; font-size: 0.85em;">
                  <thead style="position: sticky; top: 0; background: #f5f5f5;">
                    <tr>
                      <th style="text-align: left; padding: 8px 12px; border-bottom: 1px solid #e0e0e0;">Word</th>
                      <th style="text-align: left; padding: 8px 12px; border-bottom: 1px solid #e0e0e0;">Translation</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (w of data.progress.updatedWords; track w.id) {
                      <tr>
                        <td style="padding: 6px 12px; border-bottom: 1px solid #f0f0f0;">{{ w.word }}</td>
                        <td style="padding: 6px 12px; border-bottom: 1px solid #f0f0f0;">{{ w.translation }}</td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            </div>
          }

          <!-- Created Words table -->
          @if (data.progress.createdWords && data.progress.createdWords.length > 0) {
            <div>
              <div style="font-weight: 600; margin-bottom: 8px; font-size: 0.9em; color: #2e7d32;">
                New Verbs Created ({{ data.progress.createdWords.length }})
              </div>
              <div style="max-height: 200px; overflow-y: auto; border: 1px solid #e0e0e0; border-radius: 4px;">
                <table style="width: 100%; border-collapse: collapse; font-size: 0.85em;">
                  <thead style="position: sticky; top: 0; background: #f5f5f5;">
                    <tr>
                      <th style="text-align: left; padding: 8px 12px; border-bottom: 1px solid #e0e0e0;">Verb</th>
                      <th style="text-align: left; padding: 8px 12px; border-bottom: 1px solid #e0e0e0;">Translation</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (w of data.progress.createdWords; track $index) {
                      <tr>
                        <td style="padding: 6px 12px; border-bottom: 1px solid #f0f0f0;">{{ w.word }}</td>
                        <td style="padding: 6px 12px; border-bottom: 1px solid #f0f0f0;">{{ w.translation }}</td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            </div>
          }

        </div>
      }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      @if (data?.progress?.status === 'running') {
        <button mat-raised-button color="warn" (click)="stop()">
          <mat-icon>stop</mat-icon> Stop
        </button>
      }
      <button mat-button (click)="close()">
        {{ data?.progress?.status === 'completed' ? 'Close' : 'Minimize' }}
      </button>
    </mat-dialog-actions>
  `,
})
export class VerbTaggingModalComponent {
  constructor(
    public dialogRef: MatDialogRef<VerbTaggingModalComponent>,
    @Inject(MAT_DIALOG_DATA) public data: VerbTaggingModalData,
  ) {}

  getPercent(): number {
    if (!this.data?.progress || this.data.progress.total <= 0) return 0;
    return Math.round((this.data.progress.current / this.data.progress.total) * 100);
  }

  stop(): void {
    this.data?.onStop();
  }

  close(): void {
    this.dialogRef.close();
  }
}