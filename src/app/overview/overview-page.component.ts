import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { TauriIpcService } from '../services/tau-ipc.service';
import { SettingsService } from '../services/settings.service';

@Component({ selector: 'app-overview-page', standalone: true, imports: [CommonModule, MatCardModule, MatIconModule],
  template: `
    <div style="padding: 24px; max-width: 1000px; margin: 0 auto;">
      <h2>Overview</h2>

      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-bottom: 24px;">
        <mat-card><mat-card-content style="padding: 24px; text-align: center;">
          <mat-icon style="font-size: 36px; color: #3f51b5;">trending_up</mat-icon>
          <h3>{{ stats.totalPractice }} Total Attempts</h3>
          <p style="color: #888;">vocab + exercises</p>
        </mat-card-content></mat-card>

        <mat-card><mat-card-content style="padding: 24px; text-align: center;">
          <mat-icon style="font-size: 36px; color: #4caf50;">check_circle</mat-icon>
          <h3>{{ stats.totalCorrect }} Correct</h3>
          <p style="color: #888;">{{ (stats.totalPractice > 0 ? (stats.totalCorrect / stats.totalPractice * 100) : 0) | number:'1.0-1' }}% accuracy</p>
        </mat-card-content></mat-card>

        <mat-card><mat-card-content style="padding: 24px; text-align: center;">
          <mat-icon style="font-size: 36px; color: #ff9800;">calendar_today</mat-icon>
          <h3>{{ stats.activeDays }} Active Days</h3>
          <p style="color: #888;">days with practice</p>
        </mat-card-content></mat-card>

        <mat-card><mat-card-content style="padding: 24px; text-align: center;">
          <mat-icon style="font-size: 36px; color: #e91e63;">star</mat-icon>
          <h3>{{ stats.streak }} Day Streak</h3>
          <p style="color: #888;">consecutive days</p>
        </mat-card-content></mat-card>
      </div>

      <!-- Last 7 days -->
      <h3>Last 7 Days</h3>
      <div style="display: flex; gap: 8px; margin-bottom: 16px;" *ngIf="weekDays.length > 0">
        <mat-card *ngFor="let d of weekDays" style="flex: 1; text-align: center;">
          <mat-card-content style="padding: 12px;">
            <div style="font-size: 0.75em; color: #888;">{{ d.label }}</div>
            <div [style.color]="d.hasPracticed ? '#4caf50' : '#ccc'" style="font-size: 1.5em; margin-top: 4px;">
              {{ d.hasPracticed ? '●' : '○' }}
            </div>
            <div style="font-size: 0.7em; color: #888;">{{ d.attempts }} attempts</div>
          </mat-card-content>
        </mat-card>
      </div>
    </div>
  `,
})
export class OverviewPageComponent implements OnInit {
  stats = { totalPractice: 0, totalCorrect: 0, activeDays: 0, streak: 0 };
  weekDays: any[] = [];

  constructor(private ipc: TauriIpcService, private settings: SettingsService) {}

  async ngOnInit() {
    try {
      const [vs, es] = await Promise.all([
        this.ipc.invoke<any[]>('get_vocabulary_session_logs'),
        this.ipc.invoke<any[]>('get_exercise_session_logs'),
      ]);
      const s = this.settings.get();

      // Combine session logs
      const dateMap = new Map<string, { attempts: number; correct: number }>();
      for (const log of [...(vs||[]), ...(es||[])]) {
        const d = log.date || log['date'];
        if (!d) continue;
        const a = log.totalAttempts || log['total_attempts'] || 0;
        const c = log.correctCount || log['correct_count'] || 0;
        const existing = dateMap.get(d) || { attempts: 0, correct: 0 };
        dateMap.set(d, { attempts: existing.attempts + a, correct: existing.correct + c });
      }

      this.stats.activeDays = dateMap.size;
      this.stats.totalPractice = Array.from(dateMap.values()).reduce((sum, v) => sum + v.attempts, 0);
      this.stats.totalCorrect = Array.from(dateMap.values()).reduce((sum, v) => sum + v.correct, 0);

      // Streak
      let streak = 0;
      const today = new Date();
      for (let i = 0; i < 100; i++) {
        const d = new Date(today); d.setDate(d.getDate() - i);
        const key = d.toISOString().slice(0, 10);
        if (dateMap.has(key)) streak++; else break;
      }
      this.stats.streak = streak;

      // Last 7 days
      const days: any[] = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date(today); d.setDate(d.getDate() - i);
        const key = d.toISOString().slice(0, 10);
        const dayNames = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
        const entry = dateMap.get(key);
        days.push({
          label: i === 0 ? 'Today' : dayNames[d.getDay()],
          hasPracticed: !!entry,
          attempts: entry?.attempts || 0,
        });
      }
      this.weekDays = days;
    } catch { /* silent */ }
  }
}