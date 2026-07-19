import { Component, Inject, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule, MatDialog } from '@angular/material/dialog';
import { TranslationService } from '../../services/translation.service';
import { ExerciseAiChatModalComponent, ExerciseAiChatModalData } from './exercise-ai-chat-modal.component';
import { addTagWithMutualExclusion } from '../../utils/tag-mutual-exclusion.util';

export interface EditExerciseModalData {
  exercise: any;
  allTags: string[];
  isSaving: boolean;
  error: string;
  onSaved: (data: any) => void;
  onDelete?: (exercise: any) => void;
  onViewLogs?: (exercise: any) => void;
}

@Component({
  selector: 'app-edit-exercise-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, MatCardModule, MatButtonModule, MatIconModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatChipsModule, MatProgressSpinnerModule, MatDialogModule],
  template: `
    <h2 mat-dialog-title style="display: flex; align-items: center; gap: 8px;">
      <mat-icon>edit</mat-icon> Edit Exercise
    </h2>
    <mat-dialog-content>
      @if (data.error) {
        <mat-card style="margin-bottom: 16px; background: #fbe9e7;">
          <mat-card-content><p style="color: #c62828; margin: 0;">{{ data.error }}</p></mat-card-content>
        </mat-card>
      }
      @if (editError()) {
        <mat-card style="margin-bottom: 16px; background: #fbe9e7;">
          <mat-card-content><p style="color: #c62828; margin: 0;">{{ editError() }}</p></mat-card-content>
        </mat-card>
      }

      <!-- Practice Language Text -->
      <mat-form-field appearance="outline" style="width: 100%; margin-bottom: 4px;">
        <mat-label>Practice Language Text</mat-label>
        <textarea matInput [(ngModel)]="practiceText" rows="2"></textarea>
      </mat-form-field>
      <div style="display: flex; gap: 4px; justify-content: flex-end; margin-bottom: 12px;">
        <button mat-icon-button color="accent" matTooltip="Speak"
          (click)="speak(practiceText, practiceLanguage)"
          [disabled]="!practiceText.trim() || !practiceLanguage || data.isSaving">
          <mat-icon>volume_up</mat-icon>
        </button>
        <button mat-icon-button matTooltip="Copy" (click)="copyText(practiceText)"
          [disabled]="!practiceText.trim() || data.isSaving">
          <mat-icon>content_copy</mat-icon>
        </button>
        <button mat-icon-button matTooltip="Paste" (click)="pasteToPracticeText()"
          [disabled]="data.isSaving">
          <mat-icon>content_paste</mat-icon>
        </button>
        <button mat-icon-button color="warn" matTooltip="Clear"
          (click)="practiceText = ''"
          [disabled]="!practiceText.trim() || data.isSaving">
          <mat-icon>backspace</mat-icon>
        </button>
      </div>

      <!-- Native Language Text -->
      <mat-form-field appearance="outline" style="width: 100%; margin-bottom: 4px;">
        <mat-label>Native Language Text</mat-label>
        <textarea matInput [(ngModel)]="nativeText" rows="2"></textarea>
      </mat-form-field>
      <div style="display: flex; gap: 4px; justify-content: flex-end; margin-bottom: 12px;">
        <button mat-icon-button color="accent" matTooltip="Speak"
          (click)="speak(nativeText, nativeLanguage)"
          [disabled]="!nativeText.trim() || !nativeLanguage || data.isSaving">
          <mat-icon>volume_up</mat-icon>
        </button>
        <button mat-icon-button matTooltip="Copy" (click)="copyText(nativeText)"
          [disabled]="!nativeText.trim() || data.isSaving">
          <mat-icon>content_copy</mat-icon>
        </button>
        <button mat-icon-button matTooltip="Paste" (click)="pasteToNativeText()"
          [disabled]="data.isSaving">
          <mat-icon>content_paste</mat-icon>
        </button>
        <button mat-icon-button color="warn" matTooltip="Clear"
          (click)="nativeText = ''"
          [disabled]="!nativeText.trim() || data.isSaving">
          <mat-icon>backspace</mat-icon>
        </button>
      </div>

      <div style="display: flex; gap: 12px; margin-bottom: 12px;">
        <mat-form-field appearance="outline" style="flex: 1;">
          <mat-label>Practice Language</mat-label>
          <mat-select [(ngModel)]="practiceLanguage">
            @for (l of languages(); track l) {
              <mat-option [value]="l">{{ l | uppercase }}</mat-option>
            }
          </mat-select>
        </mat-form-field>
        <mat-form-field appearance="outline" style="flex: 1;">
          <mat-label>Native Language</mat-label>
          <mat-select [(ngModel)]="nativeLanguage">
            @for (l of languages(); track l) {
              <mat-option [value]="l">{{ l | uppercase }}</mat-option>
            }
          </mat-select>
        </mat-form-field>
      </div>

      <mat-form-field appearance="outline" style="width: 100%; margin-bottom: 12px;">
        <mat-label>Difficulty</mat-label>
        <mat-select [(ngModel)]="difficulty">
          <mat-option value="">None</mat-option>
          <mat-option value="easy">Easy</mat-option>
          <mat-option value="medium">Medium</mat-option>
          <mat-option value="hard">Hard</mat-option>
        </mat-select>
      </mat-form-field>

      <!-- Translate & AI Review -->
      <div style="display: flex; gap: 8px; margin-bottom: 12px;">
        <button mat-stroked-button color="primary" (click)="translate()"
          [disabled]="isTranslating() || !nativeText.trim() || !nativeLanguage || !practiceLanguage || nativeLanguage === practiceLanguage">
          @if (isTranslating()) { <mat-spinner diameter="16" style="display: inline-block; margin-right: 4px;"></mat-spinner> }
          <mat-icon style="margin-right: 4px;">translate</mat-icon> Translate
        </button>
        <button mat-stroked-button (click)="openAiChat()"
          [disabled]="!nativeText.trim() && !practiceText.trim()">
          <mat-icon style="margin-right: 4px;">smart_toy</mat-icon> AI Review
        </button>
      </div>

      <!-- Tags -->
      <mat-card style="margin-bottom: 12px;">
        <mat-card-header style="padding-bottom: 4px;">
          <mat-card-title style="font-size: 0.95rem;">Exercise Tags</mat-card-title>
        </mat-card-header>
        <mat-card-content>
          @if (formTagList.length > 0) {
            <div style="margin-bottom: 8px;">
              <div style="font-size: 0.8em; color: #888; margin-bottom: 4px;">Current Tags:</div>
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
          @if (data.allTags.length > 0) {
            <div style="font-size: 0.8em; color: #888; margin-bottom: 4px;">Quick Add from Existing:</div>
            <div style="display: flex; flex-wrap: wrap; gap: 6px; max-height: 80px; overflow-y: auto; padding: 6px; background: #f5f5f5; border-radius: 8px;">
              @for (tag of data.allTags; track tag) {
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
    </mat-dialog-content>
    <mat-dialog-actions align="end" style="display: flex; gap: 8px; flex-wrap: wrap;">
      @if (data.onDelete) {
        <button mat-button color="warn" (click)="deleteExercise()" [disabled]="data.isSaving"
          style="margin-right: auto;">
          <mat-icon>delete</mat-icon> Delete
        </button>
      }
      @if (data.onViewLogs) {
        <button mat-button (click)="viewLogs()" [disabled]="data.isSaving">
          <mat-icon>description</mat-icon> View Logs
        </button>
      }
      <button mat-button (click)="dialogRef.close()">Cancel</button>
      <button mat-raised-button color="primary" (click)="save()"
        [disabled]="!practiceText.trim() || !nativeText.trim() || data.isSaving">
        @if (data.isSaving) { <mat-spinner diameter="20" style="display: inline-block; margin-right: 8px;"></mat-spinner> }
        Save Changes
      </button>
    </mat-dialog-actions>
  `,
})
export class EditExerciseModalComponent {
  practiceText: string;
  nativeText: string;
  practiceLanguage: string;
  nativeLanguage: string;
  difficulty: string;
  formTagList: string[] = [];
  formTagInput = '';
  languages = signal<string[]>(['en', 'es', 'fr']);
  editError = signal<string | null>(null);
  isTranslating = signal(false);

  private translationService = inject(TranslationService);
  private dialog = inject(MatDialog);

  constructor(
    public dialogRef: MatDialogRef<EditExerciseModalComponent>,
    @Inject(MAT_DIALOG_DATA) public data: EditExerciseModalData,
  ) {
    const ex = data.exercise;
    this.practiceText = ex.practiceLanguageText || ex['practice_language_text'] || '';
    this.nativeText = ex.nativeLanguageText || ex['native_language_text'] || '';
    this.practiceLanguage = ex.practiceLanguage || ex['practice_language'] || '';
    this.nativeLanguage = ex.nativeLanguage || ex['native_language'] || '';
    this.difficulty = ex.difficulty || '';
    const existingTags = (ex.tags || []).filter((t: string) => !['favorite', 'review', 'ignore'].includes(t));
    this.formTagList = [...existingTags];
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

  speak(text: string, lang: string): void {
    if (!text || !lang) return;
    if (!('speechSynthesis' in window)) {
      this.setError('Text-to-speech is not supported in this browser');
      return;
    }
    const localeMap: Record<string, string> = { en: 'en-US', es: 'es-ES', fr: 'fr-FR' };
    const locale = localeMap[lang] ?? 'en-US';

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = locale;
    utterance.rate = 0.9;

    const voices = window.speechSynthesis.getVoices();
    const matchingVoice = voices.find(v => v.lang.startsWith(locale.split('-')[0]));
    if (matchingVoice) {
      utterance.voice = matchingVoice;
    }

    window.speechSynthesis.speak(utterance);
  }

  async copyText(text: string): Promise<void> {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      try { document.execCommand('copy'); } catch { /* ignore */ }
      document.body.removeChild(textarea);
    }
  }

  async pasteToNativeText(): Promise<void> {
    try {
      const text = await navigator.clipboard.readText();
      if (text && text.trim()) {
        this.nativeText = text;
        this.editError.set(null);
      } else {
        this.setError('Clipboard is empty');
      }
    } catch {
      this.setError('Unable to paste from clipboard');
    }
  }

  async pasteToPracticeText(): Promise<void> {
    try {
      const text = await navigator.clipboard.readText();
      if (text && text.trim()) {
        this.practiceText = text;
        this.editError.set(null);
      } else {
        this.setError('Clipboard is empty');
      }
    } catch {
      this.setError('Unable to paste from clipboard');
    }
  }

  private setError(message: string): void {
    this.editError.set(message);
    setTimeout(() => {
      if (this.editError() === message) {
        this.editError.set(null);
      }
    }, 3000);
  }

  deleteExercise(): void {
    if (this.data.onDelete) {
      this.data.onDelete(this.data.exercise);
    }
  }

  viewLogs(): void {
    if (this.data.onViewLogs) {
      this.data.onViewLogs(this.data.exercise);
    }
  }

  async translate(): Promise<void> {
    const native = this.nativeText.trim();
    if (!native) { this.setError('No text to translate'); return; }
    if (!this.nativeLanguage || !this.practiceLanguage) { this.setError('Please select both languages before translating'); return; }
    if (this.nativeLanguage === this.practiceLanguage) { this.setError('Native and practice languages must be different for translation'); return; }

    this.isTranslating.set(true);
    this.editError.set(null);
    try {
      const translated = await this.translationService.translateText(native, this.nativeLanguage, this.practiceLanguage);
      if (translated) {
        this.practiceText = translated;
      } else {
        this.setError('Translation failed - no result returned');
      }
    } catch (error: any) {
      const errorMsg = error instanceof Error ? error.message : 'Translation failed';
      this.setError(errorMsg);
    } finally {
      this.isTranslating.set(false);
    }
  }

  openAiChat(): void {
    this.dialog.open(ExerciseAiChatModalComponent, {
      width: '600px',
      maxHeight: '80vh',
      data: {
        exercise: this.data.exercise,
      } satisfies ExerciseAiChatModalData,
    });
  }

  save() {
    const userTags = this.formTagList;
    const systemTags = (this.data.exercise.tags || []).filter((t: string) => ['favorite', 'review', 'ignore'].includes(t));
    const tags = [...new Set([...systemTags, ...userTags])];
    const wordCount = this.practiceText.trim().split(/\s+/).filter(w => w.length > 0).length;
    this.data.onSaved({
      ...this.data.exercise,
      practiceLanguageText: this.practiceText.trim(),
      nativeLanguageText: this.nativeText.trim(),
      practiceLanguage: this.practiceLanguage,
      nativeLanguage: this.nativeLanguage,
      difficulty: this.difficulty || undefined,
      wordCount,
      tags,
    });
  }
}