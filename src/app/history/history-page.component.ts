import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatExpansionModule } from '@angular/material/expansion';
import { TauriIpcService } from '../services/tau-ipc.service';

@Component({
  selector: 'app-history-page',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatIconModule, MatExpansionModule],
  template: `
    <div style="padding: 24px; max-width: 1000px; margin: 0 auto;">
      <h2>History</h2>

      <mat-accordion>
        @for (day of history; track day.date) {
          <mat-expansion-panel>
            <mat-expansion-panel-header>
              <mat-panel-title>{{ day.date }}</mat-panel-title>
              <mat-panel-description>{{ day.totalAttempts }} attempts · {{ day.correctCount }} correct · {{ day.accuracy }}%</mat-panel-description>
            </mat-expansion-panel-header>

            @if (day.vocabAttempts>0) {
              <div style="margin-bottom:12px;">
                <strong>Vocabulary:</strong> {{ day.vocabAttempts }} attempts, {{ day.vocabCorrect }} correct ({{ day.vocabAccuracy }}%)
                <div style="font-size:0.85em;color:#888;margin-top:4px;">
                  @if (day.mc>0) { MC: {{ day.mc }} attempted · }
                  @if (day.sw>0) { SW: {{ day.sw }} attempted · }
                  @if (day.tw>0) { TW: {{ day.tw }} attempted }
                </div>
              </div>
            }

            @if (day.exAttempts>0) {
              <div style="margin-bottom:12px;">
                <strong>Exercises:</strong> {{ day.exAttempts }} attempts, {{ day.exCorrect }} correct ({{ day.exAccuracy }}%)
                <div style="font-size:0.85em;color:#888;margin-top:4px;">
                  @if (day.arr>0) { Arrange: {{ day.arr }} attempted · }
                  @if (day.fim>0) { Fill: {{ day.fim }} attempted · }
                  @if (day.stb>0) { Blanks: {{ day.stb }} attempted · }
                  @if (day.conv>0) { Conv: {{ day.conv }} attempted }
                </div>
              </div>
            }

            @if (day.vocabAttempts===0 && day.exAttempts===0) {
              <p style="color:#888;font-size:0.9em;">No detailed breakdown available for this day.</p>
            }
          </mat-expansion-panel>
        }
      </mat-accordion>

      @if (history.length===0) {
        <p style="text-align:center;color:#aaa;margin-top:40px;">No practice history yet. Session logs are created when you practice exercises or vocabulary.</p>
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

      // Vocabulary session logs
      for (const l of vs||[]) {
        const d = l.date||l['date']; if (!d) continue;
        const e = map.get(d) || this.newEntry(d);
        const ta = l.totalAttempts||l['total_attempts']||0;
        const cc = l.correctCount||l['correct_count']||0;
        e.totalAttempts += ta; e.correctCount += cc;
        e.vocabAttempts += ta; e.vocabCorrect += cc;
        e.mc += l.multipleChoiceAttempts||l['multiple_choice_attempts']||0;
        e.sw += l.spellWordAttempts||l['spell_word_attempts']||0;
        e.tw += l.typeWordAttempts||l['type_word_attempts']||0;
        map.set(d, e);
      }

      // Exercise session logs
      for (const l of es||[]) {
        const d = l.date||l['date']; if (!d) continue;
        const e = map.get(d) || this.newEntry(d);
        const ta = l.totalAttempts||l['total_attempts']||0;
        const cc = l.correctCount||l['correct_count']||0;
        e.totalAttempts += ta; e.correctCount += cc;
        e.exAttempts += ta; e.exCorrect += cc;
        e.arr += l.arrangeWordsAttempts||l['arrange_words_attempts']||0;
        e.fim += l.fillInMissingAttempts||l['fill_in_missing_attempts']||0;
        e.stb += l.spellTheBlanksAttempts||l['spell_the_blanks_attempts']||0;
        e.conv += l.conversationAttempts||l['conversation_attempts']||0;
        map.set(d, e);
      }

      // Compute accuracy
      for (const [_, e] of map) {
        e.accuracy = e.totalAttempts>0 ? Math.round(e.correctCount/e.totalAttempts*100) : 0;
        e.vocabAccuracy = e.vocabAttempts>0 ? Math.round(e.vocabCorrect/e.vocabAttempts*100) : 0;
        e.exAccuracy = e.exAttempts>0 ? Math.round(e.exCorrect/e.exAttempts*100) : 0;
      }

      this.history = Array.from(map.values()).sort((a,b) => b.date.localeCompare(a.date));
    } catch {}
  }

  private newEntry(date: string) {
    return { date, totalAttempts:0, correctCount:0, accuracy:0, vocabAttempts:0, vocabCorrect:0, vocabAccuracy:0, exAttempts:0, exCorrect:0, exAccuracy:0, mc:0, sw:0, tw:0, arr:0, fim:0, stb:0, conv:0 };
  }
}