import { Component, input, output, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { VocabularyService } from '../../services/vocabulary.service';
import { TranslationService } from '../../services/translation.service';
import { LlmService } from '../../services/llm.service';
import { SettingsService } from '../../services/settings.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { addTagWithMutualExclusion } from '../../utils/tag-mutual-exclusion.util';

@Component({
  selector: 'app-vocabulary-create-word-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, MatCardModule, MatButtonModule, MatIconModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatProgressSpinnerModule, MatChipsModule],
  template: `
    @if (isOpen()) {
      <div style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); z-index: 1000; display: flex; align-items: center; justify-content: center;">
        <mat-card style="width: 90%; max-width: 550px; max-height: 90vh; overflow: hidden; display: flex; flex-direction: column;">
          <mat-card-header style="flex-shrink: 0;">
            <mat-card-title>Add Vocabulary Word</mat-card-title>
            <button mat-icon-button (click)="onDismiss()" style="margin-left: auto;">
              <mat-icon>close</mat-icon>
            </button>
          </mat-card-header>
          <mat-card-content style="overflow-y: auto; flex: 1; padding-top: 16px;">
            @if (createError()) {
              <div style="color: #c62828; padding: 8px; margin-bottom: 12px; background: #fbe9e7; border-radius: 4px; font-size: 0.9em;">
                {{ createError() }}
              </div>
            }

            <!-- Word -->
            <mat-form-field appearance="outline" style="width: 100%; margin-bottom: 4px;">
              <mat-label>Word (in practice language)</mat-label>
              <input matInput [(ngModel)]="wordText" placeholder="e.g. correr">
            </mat-form-field>
            <div style="display: flex; gap: 4px; justify-content: flex-end; margin-bottom: 12px;">
              <button mat-icon-button color="accent" matTooltip="Speak" (click)="speak(wordText, practiceLanguage)"
                [disabled]="!wordText.trim() || !practiceLanguage">
                <mat-icon>volume_up</mat-icon>
              </button>
              <button mat-icon-button matTooltip="Copy" (click)="copyText(wordText)" [disabled]="!wordText.trim()">
                <mat-icon>content_copy</mat-icon>
              </button>
              <button mat-icon-button matTooltip="Paste" (click)="pasteToWord()">
                <mat-icon>content_paste</mat-icon>
              </button>
            </div>

            <!-- Translation -->
            <mat-form-field appearance="outline" style="width: 100%; margin-bottom: 4px;">
              <mat-label>Translation (native language meaning)</mat-label>
              <textarea matInput [(ngModel)]="translationText" rows="2" placeholder="e.g. to run"></textarea>
            </mat-form-field>
            <div style="display: flex; gap: 4px; justify-content: flex-end; margin-bottom: 12px;">
              <button mat-icon-button color="accent" matTooltip="Speak" (click)="speak(translationText, nativeLanguage)"
                [disabled]="!translationText.trim() || !nativeLanguage">
                <mat-icon>volume_up</mat-icon>
              </button>
              <button mat-icon-button matTooltip="Copy" (click)="copyText(translationText)" [disabled]="!translationText.trim()">
                <mat-icon>content_copy</mat-icon>
              </button>
              <button mat-icon-button matTooltip="Paste" (click)="pasteToTranslation()">
                <mat-icon>content_paste</mat-icon>
              </button>
            </div>

            <!-- Practice Language -->
            <mat-form-field appearance="outline" style="width: 100%; margin-bottom: 12px;">
              <mat-label>Practice Language</mat-label>
              <mat-select [(ngModel)]="practiceLanguage">
                <mat-option value="en">English</mat-option>
                <mat-option value="es">Spanish</mat-option>
                <mat-option value="fr">French</mat-option>
              </mat-select>
            </mat-form-field>

            <!-- Native Language -->
            <mat-form-field appearance="outline" style="width: 100%; margin-bottom: 12px;">
              <mat-label>Native Language</mat-label>
              <mat-select [(ngModel)]="nativeLanguage">
                <mat-option value="en">English</mat-option>
                <mat-option value="es">Spanish</mat-option>
                <mat-option value="fr">French</mat-option>
              </mat-select>
            </mat-form-field>

            <!-- Translate, Random, Generate Sentence -->
            <div style="display: flex; gap: 8px; margin-bottom: 12px; flex-wrap: wrap; align-items: center;">
              <button mat-stroked-button color="primary" (click)="translateWord()"
                [disabled]="isTranslating() || isGeneratingRandom() || !wordText.trim() || !practiceLanguage || !nativeLanguage || practiceLanguage === nativeLanguage">
                @if (isTranslating()) { <mat-spinner diameter="16" style="display: inline-block; margin-right: 4px;"></mat-spinner> }
                <mat-icon style="margin-right: 4px;">translate</mat-icon> Translate
              </button>
              <button mat-stroked-button (click)="generateRandomWord()"
                [disabled]="isGeneratingRandom() || isTranslating()">
                @if (isGeneratingRandom()) { <mat-spinner diameter="16" style="display: inline-block; margin-right: 4px;"></mat-spinner> }
                <mat-icon style="margin-right: 4px;">shuffle</mat-icon> Random Word
              </button>
              <mat-form-field appearance="outline" style="width: 110px;">
                <mat-select [(ngModel)]="randomLengthValue">
                  <mat-option value="low">Simple</mat-option>
                  <mat-option value="medium">Medium</mat-option>
                  <mat-option value="high">Advanced</mat-option>
                </mat-select>
              </mat-form-field>
              <button mat-stroked-button (click)="openSentenceModal()"
                [disabled]="!wordText.trim() || !translationText.trim() || isSaving()">
                <mat-icon style="margin-right: 4px;">description</mat-icon> Generate Sentence
              </button>
            </div>

            <!-- Difficulty -->
            <mat-form-field appearance="outline" style="width: 100%; margin-bottom: 12px;">
              <mat-label>Difficulty</mat-label>
              <mat-select [(ngModel)]="difficultyText">
                <mat-option value="">Auto</mat-option>
                <mat-option value="easy">Easy</mat-option>
                <mat-option value="medium">Medium</mat-option>
                <mat-option value="hard">Hard</mat-option>
              </mat-select>
            </mat-form-field>

            <!-- Notes -->
            <mat-form-field appearance="outline" style="width: 100%; margin-bottom: 12px;">
              <mat-label>Notes (optional)</mat-label>
              <textarea matInput [(ngModel)]="notesText" rows="2" placeholder="e.g. irregular verb"></textarea>
            </mat-form-field>

            <!-- Tags -->
            <mat-card style="margin-bottom: 12px;">
              <mat-card-header style="padding-bottom: 4px;">
                <mat-card-title style="font-size: 0.95rem;">Word Tags</mat-card-title>
              </mat-card-header>
              <mat-card-content>
                @if (formTagList.length > 0) {
                  <div style="margin-bottom: 8px;">
                    <div style="font-size: 0.8em; color: #888; margin-bottom: 4px;">Tags:</div>
                    <div style="display: flex; flex-wrap: wrap; gap: 6px;">
                      @for (tag of formTagList; track tag) {
                        <span (click)="removeTag(tag)" style="background: #e3f2fd; padding: 4px 10px; border-radius: 12px; font-size: 0.8em; cursor: pointer; display: flex; align-items: center; gap: 4px;">
                          {{ tag }}
                          <mat-icon style="font-size: 14px; color: #f44336;">close</mat-icon>
                        </span>
                      }
                    </div>
                  </div>
                }
                <div style="display: flex; gap: 8px; margin-bottom: 8px;">
                  <mat-form-field appearance="outline" style="flex: 1;">
                    <input matInput [(ngModel)]="formTagInput" placeholder="Add tag..." (keydown.enter)="addTypedTag()">
                  </mat-form-field>
                  <button mat-raised-button color="primary" (click)="addTypedTag()"
                    [disabled]="!formTagInput.trim() || formTagList.includes(formTagInput.trim().toLowerCase())">
                    <mat-icon>add</mat-icon> Add
                  </button>
                </div>
                @if (allTags().length > 0) {
                  <div style="font-size: 0.8em; color: #888; margin-bottom: 4px;">Quick Add from Existing:</div>
                  <div style="display: flex; flex-wrap: wrap; gap: 6px; max-height: 80px; overflow-y: auto; padding: 6px; background: #f5f5f5; border-radius: 8px;">
                    @for (tag of allTags(); track tag) {
                      @if (!formTagList.includes(tag)) {
                        <span (click)="addExistingTag(tag)" style="background: #e0e0e0; padding: 2px 8px; border-radius: 10px; font-size: 0.75em; cursor: pointer;">
                          {{ tag }}
                        </span>
                      }
                    }
                  </div>
                }
              </mat-card-content>
            </mat-card>
          </mat-card-content>
          <mat-card-actions style="flex-shrink: 0; display: flex; gap: 8px; justify-content: flex-end; padding: 8px 16px 16px;">
            <button mat-button (click)="onDismiss()">Cancel</button>
            <button mat-raised-button color="primary" (click)="save()"
              [disabled]="!wordText.trim() || !translationText.trim() || isSaving()">
              @if (isSaving()) { <mat-spinner diameter="16" style="display: inline-block; margin-right: 4px;"></mat-spinner> }
              Save Word
            </button>
          </mat-card-actions>
        </mat-card>
      </div>
    }
  `,
})
export class VocabularyCreateWordModalComponent {
  isOpen = input<boolean>(false);
  allTags = input<string[]>([]);

  closed = output<void>();
  created = output<void>();
  openSentenceGen = output<any>();

  wordText = '';
  translationText = '';
  practiceLanguage: 'en' | 'es' | 'fr' = 'es';
  nativeLanguage: 'en' | 'es' | 'fr' = 'en';
  difficultyText = '';
  notesText = '';
  formTagList: string[] = [];
  formTagInput = '';
  randomLengthValue: 'low' | 'medium' | 'high' = 'medium';

  isSaving = signal(false);
  isTranslating = signal(false);
  isGeneratingRandom = signal(false);
  createError = signal<string | null>(null);

  private vocab = inject(VocabularyService);
  private translationService = inject(TranslationService);
  private llmService = inject(LlmService);
  private settings = inject(SettingsService);
  private snackBar = inject(MatSnackBar);

  constructor() {
    const s = this.settings.get();
    if (s.practiceLanguage) this.practiceLanguage = s.practiceLanguage;
    if (s.nativeLanguage) this.nativeLanguage = s.nativeLanguage;
  }

  speak(text: string, lang?: string): void {
    if (!text || !lang) return;
    if (!('speechSynthesis' in window)) return;
    const localeMap: Record<string, string> = { en: 'en-US', es: 'es-ES', fr: 'fr-FR' };
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = localeMap[lang] ?? 'en-US';
    utterance.rate = 0.9;
    const voices = window.speechSynthesis.getVoices();
    const match = voices.find(v => v.lang.startsWith(localeMap[lang]?.split('-')[0] ?? 'en'));
    if (match) utterance.voice = match;
    window.speechSynthesis.speak(utterance);
  }

  async copyText(text: string): Promise<void> {
    if (!text) return;
    try { await navigator.clipboard.writeText(text); } catch {}
  }

  async pasteToWord(): Promise<void> {
    try {
      const text = await navigator.clipboard.readText();
      if (text?.trim()) this.wordText = text;
    } catch {}
  }

  async pasteToTranslation(): Promise<void> {
    try {
      const text = await navigator.clipboard.readText();
      if (text?.trim()) this.translationText = text;
    } catch {}
  }

  async translateWord(): Promise<void> {
    if (!this.wordText.trim()) return;
    if (!this.practiceLanguage || !this.nativeLanguage) return;
    if (this.practiceLanguage === this.nativeLanguage) {
      this.createError.set('Practice and native languages must be different for translation');
      return;
    }
    this.isTranslating.set(true);
    this.createError.set(null);
    try {
      const result = await this.translationService.translateText(
        this.wordText.trim(), this.practiceLanguage, this.nativeLanguage,
      );
      if (result) this.translationText = result;
      else this.createError.set('No result');
    } catch (e: any) {
      this.createError.set(e?.message ?? 'Failed');
    } finally {
      this.isTranslating.set(false);
    }
  }

  generateRandomWord(): void {
    const langNames: Record<string, string> = { en: 'English', es: 'Spanish', fr: 'French' };
    const cMap: Record<string, string> = {
      low: 'a simple beginner-level word',
      medium: 'an intermediate-level word',
      high: 'an advanced word',
    };
    const prompt = `Generate one random ${langNames[this.practiceLanguage] ?? this.practiceLanguage} vocabulary word (${cMap[this.randomLengthValue] ?? cMap['medium']}) for language learning. Return ONLY this exact format: word: <word> | translation: <${langNames[this.nativeLanguage] ?? this.nativeLanguage} translation>`;

    this.isGeneratingRandom.set(true);
    this.createError.set(null);
    this.llmService.generateWithDeepseek(prompt).then(r => {
      this.isGeneratingRandom.set(false);
      const m = r.trim().match(/word:\s*(.+?)\s*\|\s*translation:\s*(.+)/i);
      if (m) {
        this.wordText = m[1].trim();
        this.translationText = m[2].trim();
      } else {
        this.createError.set('Could not parse the generated word.');
      }
    }).catch(e => {
      this.isGeneratingRandom.set(false);
      this.createError.set(e instanceof Error ? e.message : 'Failed to generate random word.');
    });
  }

  openSentenceModal(): void {
    if (!this.wordText.trim() || !this.translationText.trim()) return;
    this.openSentenceGen.emit({
      word: this.wordText.trim(),
      translation: this.translationText.trim(),
      practiceLanguage: this.practiceLanguage,
      nativeLanguage: this.nativeLanguage,
      difficulty: this.difficultyText || undefined,
      tags: [...this.formTagList],
      notes: this.notesText.trim() || undefined,
      createdAt: Date.now(),
    });
  }

  addTypedTag(): void {
    const tag = this.formTagInput.trim().toLowerCase();
    if (!tag || this.formTagList.includes(tag)) return;
    this.formTagList = addTagWithMutualExclusion(this.formTagList, tag);
    this.formTagInput = '';
  }

  removeTag(tag: string): void {
    this.formTagList = this.formTagList.filter(t => t !== tag);
  }

  addExistingTag(tag: string): void {
    if (!this.formTagList.includes(tag)) {
      this.formTagList = addTagWithMutualExclusion(this.formTagList, tag);
    }
  }

  async save(): Promise<void> {
    const wt = this.wordText.trim();
    const tt = this.translationText.trim();
    if (!wt || !tt) return;

    const tags = [...this.formTagList];
    if (!tags.includes('manual-creation')) tags.push('manual-creation');

    this.isSaving.set(true);
    try {
      await this.vocab.create({
        word: wt,
        translation: tt,
        practiceLanguage: this.practiceLanguage,
        nativeLanguage: this.nativeLanguage,
        difficulty: this.difficultyText || undefined,
        notes: this.notesText || undefined,
        tags,
      });
      this.clear();
      this.created.emit();
      this.snackBar.open('Word created', 'OK', { duration: 2000 });
    } catch {
      this.snackBar.open('Failed to create word', 'OK', { duration: 3000 });
    }
    this.isSaving.set(false);
  }

  onDismiss(): void {
    this.clear();
    this.createError.set(null);
    this.closed.emit();
  }

  private clear(): void {
    this.wordText = '';
    this.translationText = '';
    this.difficultyText = '';
    this.notesText = '';
    this.formTagList = [];
    this.formTagInput = '';
  }
}