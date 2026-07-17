import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatExpansionModule } from '@angular/material/expansion';
import { TauriIpcService } from '../services/tau-ipc.service';

@Component({ selector: 'app-history-page', standalone: true,
  imports: [CommonModule, MatCardModule, MatIconModule, MatListModule, MatExpansionModule],
  template: `
    <div style="padding: 24px; max-width: 1000px; margin: 0 auto;">
      <h2>History <mat-icon style="font-size: 20px; vertical-align: middle;">history</mat-icon></h2>
      <p style="color: #888;">Daily practice records across vocabulary and exercises.</p>

      <mat-accordion>
        @for (day of history; track day.date) {
          <mat-expansion-panel>
            <mat-expansion-panel-header>
              <mat-panel-title>
                {{ day.date }}
              </mat-panel-title>
              <mat-panel-description>
                {{ day.totalAttempts }} attempts · {{ day.correctCount }} correct
                · {{ (day.totalAttempts > 0 ? (day.correctCount / day.totalAttempts * 100) : 0) | number:'1.0-1' }}%
              </mat-panel-description>
            </mat-expansion-panel-header>
            @if (day.vocabAttempts) {
              <div style="font-size: 0.9em; color: #666;">
                <strong>Vocabulary:</strong> {{ day.vocabAttempts }} attempts, {{ day.vocabCorrect }} correct
                @if (day.mc) { <span> · MC: {{ day.mc }}</span> }
                @if (day.sw) { <span> · SW: {{ day.sw }}</span> }
                @if (day.tw) { <span> · TW: {{ day.tw }}</span> }
              </div>
            }
            @if (day.exAttempts) {
              <div style="font-size: 0.9em; color: #666; margin-top: 4px;">
                <strong>Exercises:</strong> {{ day.exAttempts }} attempts, {{ day.exCorrect }} correct
                @if (day.arr) { <span> · Arrange: {{ day.arr }}</span> }
                @if (day.fim) { <span> · Fill: {{ day.fim }}</span> }
                @if (day.stb) { <span> · Blanks: {{ day.stb }}</span> }
                @if (day.conv) { <span> · Conv: {{ day.conv }}</span> }
              </div>
            }
          </mat-expansion-panel>
        }
      </mat-accordion>

      @if (history.length === 0) {
        <p style="text-align: center; color: #aaa; margin-top: 40px;">No practice history yet.</p>
      }
    </div>
  `,
})
export class HistoryPageComponent implements OnInit {
  history: any[] = [];

  constructor(private ipc: TauriIpcService) {}

  async ngOnInit() {
    try {
      const [vs, es] = await Promise.all([
        this.ipc.invoke<any[]>('get_vocabulary_session_logs'),
        this.ipc.invoke<any[]>('get_exercise_session_logs'),
      ]);

      const map = new Map<string, any>();
      for (const l of vs || []) {
        const d = l.date || l['date']; if (!d) continue;
        const entry = map.get(d) || { date: d, totalAttempts: 0, correctCount: 0, vocabAttempts: 0, vocabCorrect: 0 };
        const a = l.totalAttempts || l['total_attempts'] || 0;
        const c = l.correctCount || l['correct_count'] || 0;
        entry.totalAttempts += a; entry.correctCount += c;
        entry.vocabAttempts = (entry.vocabAttempts||0) + a;
        entry.vocabCorrect = (entry.vocabCorrect||0) + c;
        if (l.multipleChoiceAttempts || l['multiple_choice_attempts']) entry.mc = (entry.mc||0) + (l.multipleChoiceAttempts || l['multiple_choice_attempts']);
        if (l.spellWordAttempts || l['spell_word_attempts']) entry.sw = (entry.sw||0) + (l.spellWordAttempts || l['spell_word_attempts']);
        if (l.typeWordAttempts || l['type_word_attempts']) entry.tw = (entry.tw||0) + (l.typeWordAttempts || l['type_word_attempts']);
        map.set(d, entry);
      }
      for (const l of es || []) {
        const d = l.date || l['date']; if (!d) continue;
        const entry = map.get(d) || { date: d, totalAttempts: 0, correctCount: 0, exAttempts: 0, exCorrect: 0 };
        const a = l.totalAttempts || l['total_attempts'] || 0;
        const c = l.correctCount || l['correct_count'] || 0;
        entry.totalAttempts += a; entry.correctCount += c;
        entry.exAttempts = (entry.exAttempts||0) + a;
        entry.exCorrect = (entry.exCorrect||0) + c;
        if (l.arrangeWordsAttempts || l['arrange_words_attempts']) entry.arr = (entry.arr||0) + (l.arrangeWordsAttempts || l['arrange_words_attempts']);
        if (l.fillInMissingAttempts || l['fill_in_missing_attempts']) entry.fim = (entry.fim||0) + (l.fillInMissingAttempts || l['fill_in_missing_attempts']);
        if (l.spellTheBlanksAttempts || l['spell_the_blanks_attempts']) entry.stb = (entry.stb||0) + (l.spellTheBlanksAttempts || l['spell_the_blanks_attempts']);
        if (l.conversationAttempts || l['conversation_attempts']) entry.conv = (entry.conv||0) + (l.conversationAttempts || l['conversation_attempts']);
        map.set(d, entry);
      }
      this.history = Array.from(map.values()).sort((a, b) => b.date.localeCompare(a.date));
    } catch {}
  }
}