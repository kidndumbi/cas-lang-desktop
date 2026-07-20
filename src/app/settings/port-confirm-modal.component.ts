import { Component, Inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';

export interface PortConfirmModalData {
  port: number;
  success: boolean;
  message: string;
  onRestart: () => void;
}

@Component({
  selector: 'app-port-confirm-modal',
  standalone: true,
  imports: [MatButtonModule, MatIconModule, MatDialogModule],
  template: `
    <h2 mat-dialog-title style="display: flex; align-items: center; gap: 8px;">
      @if (!data.success) {
        <mat-icon style="color: #d32f2f;">error</mat-icon> Port Error
      }
      @if (data.success) {
        <mat-icon style="color: #2e7d32;">check_circle</mat-icon> Port {{ data.port }} Saved
      }
    </h2>
    <mat-dialog-content>
      <p style="font-size: 0.95em; line-height: 1.5; color: #333;">
        {{ data.message }}
      </p>
      @if (data.success) {
        <p style="font-size: 0.85em; color: #888; margin-top: 8px;">
          The app must be restarted for the new port to take effect.
        </p>
      }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      @if (data.success) {
        <button mat-raised-button color="accent" (click)="restart()">
          <mat-icon>restart_alt</mat-icon> Restart Now
        </button>
      }
      <button mat-button (click)="dialogRef.close()">Close</button>
    </mat-dialog-actions>
  `,
})
export class PortConfirmModalComponent {
  constructor(
    public dialogRef: MatDialogRef<PortConfirmModalComponent>,
    @Inject(MAT_DIALOG_DATA) public data: PortConfirmModalData,
  ) {}

  restart(): void {
    this.data.onRestart();
  }
}