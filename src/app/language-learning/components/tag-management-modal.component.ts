import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

@Component({
  selector: 'app-tag-management-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, MatButtonModule, MatIconModule, MatInputModule, MatProgressSpinnerModule],
  template: `
    <div style="padding: 24px; max-width: 500px; margin: 0 auto;">
      <h2 style="display: flex; align-items: center; gap: 8px;">
        <mat-icon>label</mat-icon> Manage Tags
      </h2>
      <p style="color: #888; font-size: 0.9em;">
        Create and manage tags for organizing exercises. Tags are unique strings that help categorize content.
      </p>

      <!-- Add New Tag -->
      <div style="display: flex; gap: 12px; align-items: flex-start; margin-bottom: 16px;">
        <mat-form-field appearance="outline" style="flex: 1;">
          <mat-label>New tag name</mat-label>
          <input matInput [(ngModel)]="newTagInput" placeholder="Enter tag name..." [disabled]="isAddingTag()">
        </mat-form-field>
        <button mat-raised-button color="primary" (click)="addTagRequested.emit(newTagInput); newTagInput = ''"
          [disabled]="!newTagInput.trim() || isAddingTag()" style="margin-top: 8px;">
          @if (isAddingTag()) {
            <mat-spinner diameter="20" style="display: inline-block;"></mat-spinner>
          } @else {
            <mat-icon>add</mat-icon>
          }
          {{ isAddingTag() ? 'Adding...' : 'Add' }}
        </button>
      </div>

      @if (tagError()) {
        <p style="color: #f44336; font-size: 0.85em; margin-bottom: 12px;">{{ tagError() }}</p>
      }

      <!-- Existing Tags -->
      <h3>Existing Tags ({{ allTags().length }})</h3>
      <div style="display: flex; flex-wrap: wrap; gap: 8px;">
        @for (tag of allTags(); track tag) {
          <div style="display: flex; align-items: center; background: #e3f2fd; border-radius: 16px; padding: 4px 8px 4px 12px;">
            <span>{{ tag }}</span>
            <button mat-icon-button style="width: 28px; height: 28px; line-height: 28px;" (click)="deleteTagRequested.emit(tag)" [disabled]="isDeletingTag()">
              <mat-icon style="font-size: 16px;">close</mat-icon>
            </button>
          </div>
        }
      </div>
    </div>
  `,
})
export class TagManagementModalComponent {
  allTags = input.required<string[]>();
  newTagInput = '';
  isAddingTag = input<boolean>(false);
  isDeletingTag = input<boolean>(false);
  tagError = input<string>('');

  addTagRequested = output<string>();
  deleteTagRequested = output<string>();
  closed = output<void>();
}