import { Component, Inject, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { LlmService } from '../../services/llm.service';
import { TranslationService } from '../../services/translation.service';

export interface VocabularySentenceModalData {
  word: any;
}

@Component({
  selector: 'app-vocabulary-sentence-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, MatCardModule, MatButtonModule, MatIconModule, MatFormFieldModule, MatInputModule, MatProgressSpinnerModule, MatChipsModule, MatDialogModule],
  template: `
    <h2 mat-dialog-title style="display: flex; align-items: center; gap: 8px;">
      <mat-icon>sparkles</mat-icon> Generate Example Sentence
    </h2>
    <mat-dialog-content>
      <div style="display: flex; gap: 8px; margin-bottom: 16px; flex-wrap: wrap; align-items: center;">
        <span style="font-weight: 500;">{{ data.word.word }}</span>
        <mat-icon style="font-size: 16px; color: #999;">arrow_forward</mat-icon>
        <span style="color: #888;">{{ data.word.translation }}</span>
      </div>

      @if (isGenerating() || isTranslating()) {
        <div style="display: flex; gap: 8px; align-items: center; margin-bottom: 12px; flex-wrap: wrap;">
          @if (isGenerating()) {
            <span style="background: #e8f5e9; padding: 2px 10px; border-radius: 10px; font-size: 0.75em; display: flex; align-items: center; gap: 4px;">
              <mat-spinner diameter="12" style="display: inline-block;"></mat-spinner> Generating...
            </span>
          }
          @if (isTranslating()) {
            <span style="background: #fff3e0; padding: 2px 10px; border-radius: 10px; font-size: 0.75em; display: flex; align-items: center; gap: 4px;">
              <mat-spinner diameter="12" style="display: inline-block;"></mat-spinner> Translating...
            </span>
          }
        </div>
      }

      @if (generationError()) {
        <div style="color: #c62828; padding: 8px; margin-bottom: 12px; background: #fbe9e7; border-radius: 4px; font-size: 0.9em;">
          {{ generationError() }}
        </div>
      }

      @if (practiceSentence()) {
        <mat-card style="margin-bottom: 12px;">
          <mat-card-header style="padding-bottom: 4px;">
            <div style="display: flex; align-items: center; justify-content: space-between; width: 100%;">
              <span style="font-size: 0.9em; color: #3f51b5;">{{ practiceLangLabel() }}</span>
              <div style="display: flex; align-items: center; gap: 4px;">
                <span style="background: #e8eaf6; padding: 1px 8px; border-radius: 8px; font-size: 0.7em; color: #3f51b5;">DeepSeek</span>
                <button mat-icon-button style="width: 32px; height: 32px;" (click)="copyText(practiceSentence())" title="Copy">
                  <mat-icon style="font-size: 16px;">content_copy</mat-icon>
                </button>
              </div>
            </div>
          </mat-card-header>
          <mat-card-content>
            <mat-form-field appearance="outline" style="width: 100%;">
              <textarea matInput [(ngModel)]="practiceSentenceInput" rows="3" style="font-size: 1.05rem; line-height: 1.6;"></textarea>
            </mat-form-field>
          </mat-card-content>
        </mat-card>
      }

      @if (nativeSentence()) {
        <mat-card style="margin-bottom: 12px;">
          <mat-card-header style="padding-bottom: 4px;">
            <div style="display: flex; align-items: center; justify-content: space-between; width: 100%;">
              <span style="font-size: 0.9em; color: #888;">{{ nativeLangLabel() }}</span>
              <button mat-icon-button style="width: 32px; height: 32px;" (click)="copyText(nativeSentence())" title="Copy">
                <mat-icon style="font-size: 16px;">content_copy</mat-icon>
              </button>
            </div>
          </mat-card-header>
          <mat-card-content>
            <mat-form-field appearance="outline" style="width: 100%;">
              <textarea matInput [(ngModel)]="nativeSentenceInput" rows="3" style="font-size: 1rem; line-height: 1.6; color: #888;"></textarea>
            </mat-form-field>
          </mat-card-content>
        </mat-card>
      }
    </mat-dialog-content>
    <mat-dialog-actions align="end" style="display: flex; gap: 8px;">
      <button mat-button (click)="dialogRef.close()">Close</button>
      <button mat-stroked-button (click)="generate()" [disabled]="isGenerating() || isTranslating()">
        {{ practiceSentence() ? 'Regenerate' : 'Generate' }}
      </button>
    </mat-dialog-actions>
  `,
})
export class VocabularySentenceModalComponent {
  private llm = inject(LlmService);
  private translation = inject(TranslationService);

  practiceSentence = signal('');
  nativeSentence = signal('');
  practiceSentenceInput = '';
  nativeSentenceInput = '';
  isGenerating = signal(false);
  isTranslating = signal(false);
  generationError = signal<string | null>(null);

  constructor(
    public dialogRef: MatDialogRef<VocabularySentenceModalComponent>,
    @Inject(MAT_DIALOG_DATA) public data: VocabularySentenceModalData,
  ) {
    this.generate();
  }

  practiceLangLabel(): string {
    const code = this.data.word?.practiceLanguage || '';
    return code === 'en' ? 'English' : code === 'es' ? 'Spanish' : code === 'fr' ? 'French' : code.toUpperCase();
  }

  nativeLangLabel(): string {
    const code = this.data.word?.nativeLanguage || '';
    return code === 'en' ? 'English' : code === 'es' ? 'Spanish' : code === 'fr' ? 'French' : code.toUpperCase();
  }

  generate(): void {
    const w = this.data.word;
    if (!w) return;
    this.practiceSentence.set('');
    this.nativeSentence.set('');
    this.practiceSentenceInput = '';
    this.nativeSentenceInput = '';
    this.generationError.set(null);
    this.isGenerating.set(true);

    const practiceLang = this.practiceLangLabel();
    const prompt = `Write one natural, conversational example sentence in ${practiceLang} that uses the word "${w.word}". Return only the sentence, no labels, no extra text.`;
    this.llm.generateWithDeepseek(prompt).then((sentence) => {
      this.isGenerating.set(false);
      this.practiceSentence.set(sentence);
      this.practiceSentenceInput = sentence;
      if (!sentence) { this.generationError.set('Generation produced no output.'); return; }
      this.isTranslating.set(true);
      this.translation.translateText(sentence, w.practiceLanguage, w.nativeLanguage).then(t => {
        this.nativeSentence.set(t?.trim() ?? '');
        this.nativeSentenceInput = t?.trim() ?? '';
      }).catch(e => this.generationError.set(e instanceof Error ? e.message : 'Translation failed'))
        .finally(() => this.isTranslating.set(false));
    }).catch(e => { this.isGenerating.set(false); this.generationError.set(e instanceof Error ? e.message : 'Failed to generate sentence'); });
  }

  async copyText(text: string): Promise<void> {
    if (!text) return;
    try { await navigator.clipboard.writeText(text); } catch {}
  }
}