import { Component, Inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';

export interface TagManagementModalData {
  allTags: string[];
  isAddingTag: boolean;
  isDeletingTag: boolean;
  tagError: string;
  onAddTag: (tag: string) => void;
  onDeleteTag: (tag: string) => void;
}

@Component({
  selector: 'app-tag-management-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, MatButtonModule, MatIconModule, MatInputModule, MatProgressSpinnerModule, MatDialogModule],
  template: `
    <h2 mat-dialog-title style="display: flex; align-items: center; gap: 8px;">
      <mat-icon>label</mat-icon> Manage Tags
    </h2>
    <mat-dialog-content>
      <p style="color: #888; font-size: 0.9em;">
        Create and manage tags for organizing exercises. Tags are unique strings that help categorize content.
      </p>

      <!-- Add New Tag -->
      <div style="display: flex; gap: 12px; align-items: flex-start; margin-bottom: 16px;">
        <mat-form-field appearance="outline" style="flex: 1;">
          <mat-label>New tag name</mat-label>
          <input matInput [(ngModel)]="newTagInput" placeholder="Enter tag name..." [disabled]="data.isAddingTag">
        </mat-form-field>
        <button mat-raised-button color="primary" (click)="data.onAddTag(newTagInput); newTagInput = ''"
          [disabled]="!newTagInput.trim() || data.isAddingTag" style="margin-top: 8px;">
          @if (data.isAddingTag) {
            <mat-spinner diameter="20" style="display: inline-block;"></mat-spinner>
          } @else {
            <mat-icon>add</mat-icon>
          }
          {{ data.isAddingTag ? 'Adding...' : 'Add' }}
        </button>
      </div>

      @if (data.tagError) {
        <p style="color: #f44336; font-size: 0.85em; margin-bottom: 12px;">{{ data.tagError }}</p>
      }

      <!-- Existing Tags -->
      <h3>Existing Tags ({{ data.allTags.length }})</h3>
      <div style="display: flex; flex-wrap: wrap; gap: 8px;">
        @for (tag of data.allTags; track tag) {
          <div style="display: flex; align-items: center; background: #e3f2fd; border-radius: 16px; padding: 4px 8px 4px 12px;">
            <span>{{ tag }}</span>
            <button mat-icon-button style="width: 28px; height: 28px; line-height: 28px;" (click)="data.onDeleteTag(tag)" [disabled]="data.isDeletingTag">
              <mat-icon style="font-size: 16px;">close</mat-icon>
            </button>
          </div>
        }
      </div>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button (click)="dialogRef.close()">Close</button>
    </mat-dialog-actions>
  `,
})
export class TagManagementModalComponent {
  newTagInput = '';

  constructor(
    public dialogRef: MatDialogRef<TagManagementModalComponent>,
    @Inject(MAT_DIALOG_DATA) public data: TagManagementModalData,
  ) {}
}