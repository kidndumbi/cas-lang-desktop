import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { CommonModule } from '@angular/common';
import { SettingsService, AppSettings } from '../services/settings.service';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule,
    MatCardModule, MatFormFieldModule, MatSelectModule, MatButtonModule,
  ],
  template: `
    <div style="padding: 24px; max-width: 600px; margin: 0 auto;">
      <mat-card>
        <mat-card-header>
          <mat-card-title>Settings</mat-card-title>
          <mat-card-subtitle>Communication with the backend is handled locally via Tauri IPC.</mat-card-subtitle>
        </mat-card-header>
        <mat-card-content>
          <form [formGroup]="form" (ngSubmit)="save()" style="display: flex; flex-direction: column; gap: 16px; margin-top: 16px;">
            <mat-form-field appearance="outline">
              <mat-label>Native Language</mat-label>
              <mat-select formControlName="nativeLanguage">
                <mat-option value="en">English</mat-option>
                <mat-option value="es">Spanish</mat-option>
                <mat-option value="fr">French</mat-option>
              </mat-select>
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Practice Language</mat-label>
              <mat-select formControlName="practiceLanguage">
                <mat-option value="en">English</mat-option>
                <mat-option value="es">Spanish</mat-option>
                <mat-option value="fr">French</mat-option>
              </mat-select>
            </mat-form-field>
            <button mat-raised-button color="primary" type="submit" [disabled]="!form.valid">Save</button>
          </form>
        </mat-card-content>
      </mat-card>
    </div>
  `,
})
export class SettingsComponent implements OnInit {
  form: FormGroup;

  constructor(private fb: FormBuilder, private settingsService: SettingsService) {
    const s = this.settingsService.get();
    this.form = this.fb.group({
      nativeLanguage: [s.nativeLanguage],
      practiceLanguage: [s.practiceLanguage],
    });
  }

  ngOnInit() {}

  save() {
    if (this.form.valid) {
      this.settingsService.update(this.form.value as Partial<AppSettings>);
      alert('Settings saved!');
    }
  }
}