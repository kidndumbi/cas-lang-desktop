import { Component, Inject, OnInit, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { VocabularyService } from '../../services/vocabulary.service';

export interface VocabularyLogsModalData {
  wordId: string;
}

@Component({
  selector: 'app-vocabulary-logs-modal',
  standalone: true,
  imports: [CommonModule, DatePipe, MatCardModule, MatButtonModule, MatIconModule, MatProgressSpinnerModule, MatDialogModule],
  template: `
    <h2 mat-dialog-title style="display: flex; align-items: center; gap: 8px;">
      <mat-icon>description</mat-icon> Word Logs
    </h2>
    <mat-dialog-content>
      @if (isLoading()) {
        <div style="display: flex; justify-content: center; padding: 2rem;">
          <mat-spinner diameter="40"></mat-spinner>
        </div>
      }
      @else if (loadError()) {
        <div style="text-align: center; padding: 2rem; color: #c62828;">{{ loadError() }}</div>
      }
      @else if (entries().length === 0) {
        <div style="text-align: center; padding: 2rem; color: #888;">No logs yet for this word.</div>
      }
      @else {
        @for (entry of entries(); track entry.id) {
          <div style="margin-bottom: 1rem; padding: 0.875rem; border-radius: 8px; background: #f5f5f5;"
            [style.border-left]="'4px solid ' + (entry.type === 'practice' ? (entry.practiceDetails?.isCorrect ? '#4caf50' : '#f44336') : '#3f51b5')">
            <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem;">
              <span style="font-size: 0.75rem; color: #888;">{{ entry.timestamp | date:'MMM d, y, h:mm a' }}</span>
              @if (entry.type === 'practice') {
                <span [style.background]="entry.practiceDetails?.isCorrect ? '#4caf50' : '#f44336'"
                  style="color: white; padding: 1px 8px; border-radius: 10px; font-size: 0.65rem; font-weight: 500;">
                  {{ entry.practiceDetails?.isCorrect ? '✓ Correct' : '✗ Wrong' }}
                </span>
              }
              @else {
                <span style="background: #3f51b5; color: white; padding: 1px 8px; border-radius: 10px; font-size: 0.65rem; font-weight: 500;">
                  <mat-icon style="font-size: 0.7rem; width: 12px; height: 12px; vertical-align: middle;">edit</mat-icon> Updated
                </span>
              }
            </div>
            @if (entry.type === 'practice' && entry.practiceDetails) {
              <div style="font-size: 0.8rem;">
                @if (entry.practiceDetails.exerciseType) {
                  <span style="color: #888; font-size: 0.65rem;">Exercise: {{ entry.practiceDetails.exerciseType }}</span>
                }
                @if (!entry.practiceDetails.isCorrect) {
                  <div style="margin-top: 0.25rem;">
                    <span style="color: #888; font-size: 0.65rem;">Expected: </span>
                    <span style="color: #2e7d32;">{{ entry.practiceDetails.correctAnswer || entry.practiceDetails.word }}</span>
                  </div>
                }
              </div>
            }
            @if ((entry.type === 'word-update' || entry.type === 'vocabulary-update') && entry.updateDetails) {
              <div style="font-size: 0.8rem;">
                <div style="color: #888; font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.35rem;">
                  Changed: {{ entry.updateDetails.changedFields?.join(', ') || '' }}
                </div>
                @if (entry.updateDetails.changedFields) {
                  @for (field of entry.updateDetails.changedFields; track field) {
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; margin-top: 0.35rem;">
                      <div style="background: rgba(244,67,54,0.08); padding: 0.3rem 0.4rem; border-radius: 4px;">
                        <div style="font-size: 0.65rem; color: #f44336; margin-bottom: 0.1rem;">{{ field }} (before)</div>
                        <div style="word-break: break-word;">{{ formatFieldValue(entry.updateDetails.before[field]) }}</div>
                      </div>
                      <div style="background: rgba(76,175,80,0.08); padding: 0.3rem 0.4rem; border-radius: 4px;">
                        <div style="font-size: 0.65rem; color: #4caf50; margin-bottom: 0.1rem;">{{ field }} (after)</div>
                        <div style="word-break: break-word;">{{ formatFieldValue(entry.updateDetails.after[field]) }}</div>
                      </div>
                    </div>
                  }
                }
              </div>
            }
          </div>
        }
      }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button (click)="dialogRef.close()">Close</button>
    </mat-dialog-actions>
  `,
})
export class VocabularyLogsModalComponent implements OnInit {
  isLoading = signal(false);
  loadError = signal<string | null>(null);
  entries = signal<any[]>([]);

  constructor(
    public dialogRef: MatDialogRef<VocabularyLogsModalComponent>,
    @Inject(MAT_DIALOG_DATA) public data: VocabularyLogsModalData,
    private vocabService: VocabularyService,
  ) {}

  async ngOnInit() {
    if (this.data.wordId) {
      await this.loadLogs(this.data.wordId);
    }
  }

  private async loadLogs(wordId: string) {
    this.isLoading.set(true);
    this.loadError.set(null);
    try {
      const data = await this.vocabService.getLogs(wordId);
      const rawEntries = data?.entries || data?.Entries || [];
      this.entries.set([...rawEntries].sort((a: any, b: any) => b.timestamp - a.timestamp));
    } catch (err: any) {
      this.loadError.set(err?.message ?? 'Failed to load logs');
    }
    this.isLoading.set(false);
  }

  formatFieldValue(value: any): string {
    if (Array.isArray(value)) return value.join(', ') || '(none)';
    if (value === null || value === undefined || value === '') return '(empty)';
    return String(value);
  }
}