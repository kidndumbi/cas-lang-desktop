import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatExpansionModule } from '@angular/material/expansion';
import { VocabularyService } from '../services/vocabulary.service';
import { SettingsService } from '../services/settings.service';
import { TauriIpcService } from '../services/tau-ipc.service';

@Component({ selector: 'app-verbs-page', standalone: true,
  imports: [CommonModule, FormsModule, MatCardModule, MatIconModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatExpansionModule],
  template: `
    <div style="padding: 24px; max-width: 1000px; margin: 0 auto;">
      <h2>Verbs <mat-icon style="font-size: 20px; vertical-align: middle;">grid_view</mat-icon></h2>
      <p style="color: #888;">Verbs identified from vocabulary with conjugation data.</p>

      @for (verb of verbs; track verb.id || verb['id'] || $index) {
        <mat-card style="margin-bottom: 8px;">
          <mat-card-content style="padding: 12px 16px;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <div>
                <strong style="font-size: 1.1em;">{{ verb.word }}</strong>
                <span style="color: #888; margin-left: 8px;">— {{ verb.translation }}</span>
              </div>
              @if (verb.tensesId || verb['tenses_id']) {
                <span style="font-size: 0.8em; color: #4caf50;">
                  <mat-icon style="font-size: 16px; vertical-align: middle;">check_circle</mat-icon> Conjugations available
                </span>
              } @else {
                <span style="font-size: 0.8em; color: #ff9800;">
                  <mat-icon style="font-size: 16px; vertical-align: middle;">pending</mat-icon> No conjugations yet
                </span>
              }
            </div>
          </mat-card-content>
        </mat-card>
      }

      @if (verbs.length === 0) {
        <p style="text-align: center; color: #aaa; margin-top: 40px;">No verbs identified yet. Add vocabulary words tagged as verbs.</p>
      }
    </div>
  `,
})
export class VerbsPageComponent implements OnInit {
  verbs: any[] = [];

  constructor(private vocab: VocabularyService, private settings: SettingsService, private ipc: TauriIpcService) {}

  async ngOnInit() {
    try {
      const s = this.settings.get();
      const all = await this.vocab.getAll(s.practiceLanguage, s.nativeLanguage);
      this.verbs = all.filter((w: any) => {
        const tags: string[] = w.tags || [];
        return tags.some(t => t.toLowerCase() === 'verb' || t.toLowerCase() === 'verbs');
      });
    } catch {}
  }
}