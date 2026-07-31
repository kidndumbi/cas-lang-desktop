import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';

export interface VocabDuplicateItem {
  id: string;
  word: string;
  translation: string;
  practiceLanguage: string;
  nativeLanguage: string;
  hasInfinitiveTag: boolean;
  hasTensesId: boolean;
}

export interface VocabDuplicateGroup {
  word: string;
  practiceLanguage: string;
  items: VocabDuplicateItem[];
}

export interface VocabDuplicatesModalData {
  groups: VocabDuplicateGroup[];
  onDelete: (id: string) => Promise<void>;
}

@Component({
  selector: 'app-vocab-duplicates-modal',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule, MatTableModule, MatDialogModule],
  template: `
    <h2 mat-dialog-title style="display: flex; align-items: center; justify-content: space-between;">
      Vocab Duplicates
      <button mat-icon-button (click)="close()" style="margin-left: auto;">
        <mat-icon>close</mat-icon>
      </button>
    </h2>
    <mat-dialog-content>
      @if (data.groups.length === 0) {
        <p style="color: #4caf50; text-align: center; padding: 16px;">No duplicates found!</p>
      }
      @else {
        <p style="font-size: 0.85em; color: #888; margin-bottom: 16px;">
          Found {{ data.groups.length }} duplicate {{ data.groups.length === 1 ? 'group' : 'groups' }}. Each group shares the same practice-language word.
        </p>
        @for (group of data.groups; track group.word + group.practiceLanguage) {
          <div style="margin-bottom: 24px; border: 1px solid #e0e0e0; border-radius: 4px; overflow: hidden;">
            <div style="background: #f5f5f5; padding: 8px 12px; font-weight: 600; font-size: 0.9em; display: flex; justify-content: space-between; align-items: center;">
              <span>"{{ group.word }}" ({{ group.practiceLanguage }}) — {{ group.items.length }} entries</span>
              <span style="font-size: 0.8em; color: #888;">{{ group.items.length - 1 }} extra {{ group.items.length - 1 === 1 ? 'copy' : 'copies' }}</span>
            </div>
            <table style="width: 100%; border-collapse: collapse; font-size: 0.85em;">
              <thead>
                <tr style="background: #fafafa;">
                  <th style="text-align: left; padding: 6px 12px; border-bottom: 1px solid #e0e0e0;">Translation</th>
                  <th style="text-align: left; padding: 6px 12px; border-bottom: 1px solid #e0e0e0;">Native Lang</th>
                  <th style="text-align: center; padding: 6px 8px; border-bottom: 1px solid #e0e0e0; width: 60px;">Infinitive</th>
                  <th style="text-align: center; padding: 6px 8px; border-bottom: 1px solid #e0e0e0; width: 60px;">Tenses</th>
                  <th style="text-align: center; padding: 6px 12px; border-bottom: 1px solid #e0e0e0; width: 80px;">Action</th>
                </tr>
              </thead>
              <tbody>
                @for (item of group.items; track item.id) {
                  <tr [style.opacity]="deletedIds.has(item.id) ? '0.4' : '1'">
                    <td style="padding: 6px 12px; border-bottom: 1px solid #f0f0f0;">{{ item.translation }}</td>
                    <td style="padding: 6px 12px; border-bottom: 1px solid #f0f0f0;">{{ item.nativeLanguage }}</td>
                    <td style="padding: 6px 8px; border-bottom: 1px solid #f0f0f0; text-align: center;">
                      @if (item.hasInfinitiveTag) {
                        <mat-icon style="font-size: 18px; color: #1976d2;" title="Has infinitive tag">check_circle</mat-icon>
                      }
                      @else {
                        <span style="color: #bdbdbd;">—</span>
                      }
                    </td>
                    <td style="padding: 6px 8px; border-bottom: 1px solid #f0f0f0; text-align: center;">
                      @if (item.hasTensesId) {
                        <mat-icon style="font-size: 18px; color: #4caf50;" title="Has tenses ID">check_circle</mat-icon>
                      }
                      @else {
                        <span style="color: #bdbdbd;">—</span>
                      }
                    </td>
                    <td style="padding: 6px 12px; border-bottom: 1px solid #f0f0f0; text-align: center;">
                      <button mat-icon-button color="warn"
                        [disabled]="deletedIds.has(item.id) || deletingIds.has(item.id)"
                        (click)="deleteItem(item.id)"
                        style="transform: scale(0.85);">
                        @if (deletingIds.has(item.id)) {
                          <mat-icon style="font-size: 18px;">hourglass_empty</mat-icon>
                        }
                        @else if (deletedIds.has(item.id)) {
                          <mat-icon style="font-size: 18px; color: #4caf50;">check</mat-icon>
                        }
                        @else {
                          <mat-icon style="font-size: 18px;">delete</mat-icon>
                        }
                      </button>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
      }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button (click)="close()">Close</button>
    </mat-dialog-actions>
  `,
})
export class VocabDuplicatesModalComponent {
  deletingIds = new Set<string>();
  deletedIds = new Set<string>();

  constructor(
    public dialogRef: MatDialogRef<VocabDuplicatesModalComponent>,
    @Inject(MAT_DIALOG_DATA) public data: VocabDuplicatesModalData,
  ) {}

  async deleteItem(id: string): Promise<void> {
    this.deletingIds.add(id);
    try {
      await this.data.onDelete(id);
      this.deletedIds.add(id);
    } catch {
      // silently fail, keep the row visible
    } finally {
      this.deletingIds.delete(id);
    }
  }

  close(): void {
    this.dialogRef.close();
  }
}