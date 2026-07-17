import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';

@Component({ selector: 'app-ai-vocabulary-page', standalone: true, imports: [CommonModule, MatCardModule, MatIconModule],
  template: `
    <div style="padding: 24px; max-width: 1000px; margin: 0 auto;">
      <h2>AI Vocabulary <mat-icon style="font-size: 20px; vertical-align: middle;">auto_awesome</mat-icon></h2>
      <p style="color: #888;">AI-powered vocabulary generation uses DeepSeek on the frontend. This feature is coming soon.</p>
      <mat-card style="margin-top: 16px;"><mat-card-content style="padding: 40px; text-align: center;">
        <mat-icon style="font-size: 48px; height: 48px; width: 48px; color: #ccc;">auto_awesome</mat-icon>
        <p style="color: #aaa; margin-top: 16px;">AI vocabulary generation will be available in a future update.</p>
      </mat-card-content></mat-card>
    </div>
  `,
}) export class AiVocabularyPageComponent implements OnInit { ngOnInit() {} }