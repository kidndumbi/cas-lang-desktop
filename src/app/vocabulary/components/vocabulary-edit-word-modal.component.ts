import { Component, input, output, signal, inject, effect, computed } from '@angular/core';
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
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { VocabularyService } from '../../services/vocabulary.service';
import { VocabularyLogsModalComponent, VocabularyLogsModalData } from './vocabulary-logs-modal.component';
import { TranslationService } from '../../services/translation.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { addTagWithMutualExclusion } from '../../utils/tag-mutual-exclusion.util';

const INFINITIVE_PAGE_SIZE = 25;

export interface EditWordPayload {
  word: string;
  translation: string;
  difficulty: '' | 'easy' | 'medium' | 'hard';
  notes: string;
  tags: string[];
}

@Component({
  selector: 'app-vocabulary-edit-word-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, MatCardModule, MatButtonModule, MatIconModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatChipsModule, MatProgressSpinnerModule],
  template: `
    @if (isOpen()) {
      <div style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); z-index: 1000; display: flex; align-items: center; justify-content: center;">
        <mat-card style="width: 90%; max-width: 600px; max-height: 90vh; overflow: hidden; display: flex; flex-direction: column;">
          <mat-card-header style="flex-shrink: 0;">
            <mat-card-title>Edit Word</mat-card-title>
            <button mat-icon-button (click)="close()" style="margin-left: auto;">
              <mat-icon>close</mat-icon>
            </button>
          </mat-card-header>
          <mat-card-content style="overflow-y: auto; flex: 1; padding-top: 16px;">
            @if (editError()) {
              <div style="color: #c62828; padding: 8px; margin-bottom: 12px; background: #fbe9e7; border-radius: 4px; font-size: 0.9em;">
                {{ editError() }}
              </div>
            }

            <!-- Word -->
            <mat-form-field appearance="outline" style="width: 100%; margin-bottom: 4px;">
              <mat-label>Word</mat-label>
              <input matInput [(ngModel)]="formWord">
            </mat-form-field>
            <div style="display: flex; gap: 4px; justify-content: flex-end; margin-bottom: 12px;">
              <button mat-icon-button color="accent" matTooltip="Speak" (click)="speak(formWord, word()?.practiceLanguage)"
                [disabled]="!formWord.trim() || !word()?.practiceLanguage">
                <mat-icon>volume_up</mat-icon>
              </button>
              <button mat-icon-button matTooltip="Copy" (click)="copyText(formWord)" [disabled]="!formWord.trim()">
                <mat-icon>content_copy</mat-icon>
              </button>
              <button mat-icon-button matTooltip="Paste" (click)="pasteToWord()">
                <mat-icon>content_paste</mat-icon>
              </button>
            </div>

            <!-- Translation -->
            <mat-form-field appearance="outline" style="width: 100%; margin-bottom: 4px;">
              <mat-label>Translation</mat-label>
              <textarea matInput [(ngModel)]="formTranslation" rows="2"></textarea>
            </mat-form-field>
            <div style="display: flex; gap: 4px; justify-content: flex-end; margin-bottom: 12px;">
              <button mat-icon-button color="accent" matTooltip="Speak" (click)="speak(formTranslation, word()?.nativeLanguage)"
                [disabled]="!formTranslation.trim() || !word()?.nativeLanguage">
                <mat-icon>volume_up</mat-icon>
              </button>
              <button mat-icon-button matTooltip="Copy" (click)="copyText(formTranslation)" [disabled]="!formTranslation.trim()">
                <mat-icon>content_copy</mat-icon>
              </button>
              <button mat-icon-button matTooltip="Paste" (click)="pasteToTranslation()">
                <mat-icon>content_paste</mat-icon>
              </button>
            </div>

            <!-- Translate & AI Review & Generate Sentence -->
            <div style="display: flex; gap: 8px; margin-bottom: 12px; flex-wrap: wrap;">
              <button mat-stroked-button color="primary" (click)="translateWord()"
                [disabled]="isTranslating() || isSaving() || !formWord.trim()">
                @if (isTranslating()) { <mat-spinner diameter="16" style="display: inline-block; margin-right: 4px;"></mat-spinner> }
                <mat-icon style="margin-right: 4px;">translate</mat-icon> Translate
              </button>
              <button mat-stroked-button (click)="openAiReview()"
                [disabled]="isSaving() || !formWord.trim() || !formTranslation.trim()">
                <mat-icon style="margin-right: 4px;">smart_toy</mat-icon> AI Review
              </button>
              <button mat-stroked-button (click)="openSentenceModal()"
                [disabled]="isSaving() || !formWord.trim() || !formTranslation.trim()">
                <mat-icon style="margin-right: 4px;">description</mat-icon> Generate Sentence
              </button>
            </div>

            <!-- Difficulty -->
            <mat-form-field appearance="outline" style="width: 100%; margin-bottom: 12px;">
              <mat-label>Difficulty</mat-label>
              <mat-select [(ngModel)]="formDifficulty">
                <mat-option value="">None</mat-option>
                <mat-option value="easy">Easy</mat-option>
                <mat-option value="medium">Medium</mat-option>
                <mat-option value="hard">Hard</mat-option>
              </mat-select>
            </mat-form-field>

            <!-- Notes -->
            <mat-form-field appearance="outline" style="width: 100%; margin-bottom: 12px;">
              <mat-label>Notes</mat-label>
              <textarea matInput [(ngModel)]="formNotes" rows="2"></textarea>
            </mat-form-field>

            <!-- Infinitive linking -->
            @if (infinitiveWord(); as inf) {
              <div style="margin-bottom: 12px; display: flex; align-items: center; gap: 8px;">
                <span style="color: #3f51b5; font-weight: 500;">Infinitive: {{ inf }}</span>
                <button mat-icon-button color="warn" (click)="clearInfinitive()" title="Remove">
                  <mat-icon style="font-size: 18px;">close</mat-icon>
                </button>
              </div>
            }
            @if (!isVerb() || word()?.parentVerbId) {
              <div style="margin-bottom: 12px;">
                <button mat-stroked-button (click)="showInfinitivePicker.set(true)">
                  <mat-icon>link</mat-icon>
                  {{ word()?.parentVerbId ? 'Change Infinitive' : 'Link Infinitive' }}
                </button>
              </div>
            }

            <!-- Tags -->
            <mat-card style="margin-bottom: 12px;">
              <mat-card-header style="padding-bottom: 4px;">
                <mat-card-title style="font-size: 0.95rem;">Word Tags</mat-card-title>
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
          <mat-card-actions style="flex-shrink: 0; display: flex; gap: 8px; flex-wrap: wrap; padding: 8px 16px 16px; justify-content: flex-end;">
            <button mat-button color="warn" (click)="deleteRequested.emit()" style="margin-right: auto;">
              Delete Word
            </button>
            <button mat-button (click)="openLogsModal()">
              <mat-icon>description</mat-icon> View Logs
            </button>
            <button mat-raised-button color="primary" (click)="save()"
              [disabled]="!formWord.trim() || !formTranslation.trim() || isSaving()">
              @if (isSaving()) { <mat-spinner diameter="16" style="display: inline-block; margin-right: 4px;"></mat-spinner> }
              Save Changes
            </button>
          </mat-card-actions>
        </mat-card>
      </div>
    }

    <!-- Infinitive Picker -->
    @if (showInfinitivePicker()) {
      <div style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); z-index: 1001; display: flex; align-items: center; justify-content: center;">
        <mat-card style="width: 90%; max-width: 600px; max-height: 70vh; overflow: hidden; display: flex; flex-direction: column;">
          <mat-card-header style="flex-shrink: 0;">
            <mat-card-title>Link Infinitive</mat-card-title>
            <button mat-icon-button (click)="showInfinitivePicker.set(false)" style="margin-left: auto;">
              <mat-icon>close</mat-icon>
            </button>
          </mat-card-header>
          <mat-card-content style="overflow-y: auto; flex: 1;">
            <mat-form-field appearance="outline" style="width: 100%; margin-bottom: 12px;">
              <mat-label>Search words</mat-label>
              <input matInput [(ngModel)]="infinitiveSearchTxt" (input)="infinitiveCurrentPage.set(1)" placeholder="Search...">
            </mat-form-field>
            <div style="font-size: 0.8em; color: #888; margin-bottom: 8px;">
              @if (infinitiveTotalPages() > 1) { Page {{ infinitiveCurrentPage() }} of {{ infinitiveTotalPages() }} · }
              {{ infinitiveFilteredWords().length }} word{{ infinitiveFilteredWords().length === 1 ? '' : 's' }}
            </div>
            @for (w of infinitivePaginatedWords(); track w.id) {
              <div (click)="selectInfinitive(w)" style="padding: 10px 12px; cursor: pointer; border-bottom: 1px solid #eee; display: flex; justify-content: space-between; align-items: center;">
                <div>
                  <div style="font-weight: 500;">{{ w.word }}</div>
                  <div style="font-size: 0.85em; color: #888;">{{ w.translation }}</div>
                </div>
                @if (w.tags?.length) {
                  <div style="display: flex; gap: 2px; flex-wrap: wrap;">
                    @for (tag of w.tags; track tag) {
                      <span style="background: #e0e0e0; padding: 1px 6px; border-radius: 8px; font-size: 0.65em;">{{ tag }}</span>
                    }
                  </div>
                }
              </div>
            }
            @if (infinitiveTotalPages() > 1) {
              <div style="display: flex; justify-content: center; gap: 8px; padding: 12px;">
                <button mat-button (click)="infinitivePrevPage()" [disabled]="infinitiveCurrentPage() === 1">Previous</button>
                <span style="padding: 0 8px;">{{ infinitiveCurrentPage() }} / {{ infinitiveTotalPages() }}</span>
                <button mat-button (click)="infinitiveNextPage()" [disabled]="infinitiveCurrentPage() === infinitiveTotalPages()">Next</button>
              </div>
            }
          </mat-card-content>
        </mat-card>
      </div>
    }
  `,
})
export class VocabularyEditWordModalComponent {
  isOpen = input<boolean>(false);
  word = input<any>(null);
  isSaving = input<boolean>(false);
  allTags = input<string[]>([]);
  allWords = input<any[]>([]);
  infinitiveWord = input<string | null>(null);

  closed = output<void>();
  saved = output<EditWordPayload>();
  deleteRequested = output<void>();
  parentVerbChanged = output<string | null>();
  openAiChat = output<any>();
  openSentenceGen = output<any>();
  openLogs = output<string>();

  formWord = '';
  formTranslation = '';
  formDifficulty: '' | 'easy' | 'medium' | 'hard' = '';
  formNotes = '';
  formTagList: string[] = [];
  formTagInput = '';

  isTranslating = signal(false);
  editError = signal<string | null>(null);

  // Infinitive picker
  showInfinitivePicker = signal(false);
  infinitiveSearchTxt = '';
  infinitiveCurrentPage = signal(1);

  infinitiveFilteredWords = computed(() => {
    const q = this.infinitiveSearchTxt.toLowerCase();
    const currentId = this.word()?.id;
    const pl = this.word()?.practiceLanguage;
    return this.allWords()
      .filter((w: any) => w.id !== currentId && w.practiceLanguage === pl)
      .filter((w: any) => !q || w.word.toLowerCase().includes(q) || w.translation.toLowerCase().includes(q))
      .sort((a: any, b: any) => (b.createdAt || 0) - (a.createdAt || 0));
  });

  infinitiveTotalPages = computed(() => Math.max(1, Math.ceil(this.infinitiveFilteredWords().length / INFINITIVE_PAGE_SIZE)));

  infinitivePaginatedWords = computed(() => {
    const page = Math.min(this.infinitiveCurrentPage(), this.infinitiveTotalPages());
    const start = (page - 1) * INFINITIVE_PAGE_SIZE;
    return this.infinitiveFilteredWords().slice(start, start + INFINITIVE_PAGE_SIZE);
  });

  isVerb = computed(() => this.word()?.tags?.includes('verb') ?? false);

  private translationService = inject(TranslationService);
  private snackBar = inject(MatSnackBar);
  private dialog = inject(MatDialog);

  constructor() {
    effect(() => {
      const w = this.word();
      const open = this.isOpen();
      if (w && open) {
        this.formWord = w.word || '';
        this.formTranslation = w.translation || '';
        this.formDifficulty = (w.difficulty as '' | 'easy' | 'medium' | 'hard') || '';
        this.formNotes = w.notes || '';
        this.formTagList = [...(w.tags ?? [])];
        this.formTagInput = '';
        this.editError.set(null);
      }
    });
  }

  close(): void { this.closed.emit(); }

  save(): void {
    if (!this.formWord.trim() || !this.formTranslation.trim()) return;
    this.saved.emit({
      word: this.formWord.trim(),
      translation: this.formTranslation.trim(),
      difficulty: this.formDifficulty,
      notes: this.formNotes.trim(),
      tags: this.formTagList,
    });
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
      if (text?.trim()) { this.formWord = text; this.editError.set(null); }
      else { this.setTmpError('Clipboard is empty'); }
    } catch { this.setTmpError('Unable to paste from clipboard'); }
  }

  async pasteToTranslation(): Promise<void> {
    try {
      const text = await navigator.clipboard.readText();
      if (text?.trim()) { this.formTranslation = text; this.editError.set(null); }
      else { this.setTmpError('Clipboard is empty'); }
    } catch { this.setTmpError('Unable to paste from clipboard'); }
  }

  async translateWord(): Promise<void> {
    const w = this.word();
    if (!this.formWord.trim()) { this.setTmpError('Enter a word to translate'); return; }
    if (!w) return;
    this.isTranslating.set(true);
    this.editError.set(null);
    try {
      const translated = await this.translationService.translateText(
        this.formWord.trim(), w.practiceLanguage, w.nativeLanguage,
      );
      if (translated) { this.formTranslation = translated; }
      else { this.setTmpError('Translation returned no result'); }
    } catch (err) {
      this.setTmpError(err instanceof Error ? err.message : 'Translation failed');
    } finally { this.isTranslating.set(false); }
  }

  openAiReview(): void {
    const w = this.word();
    if (!w) return;
    this.openAiChat.emit({ ...w, word: this.formWord, translation: this.formTranslation });
  }

  openSentenceModal(): void {
    const w = this.word();
    if (!w) return;
    this.openSentenceGen.emit({ ...w, word: this.formWord, translation: this.formTranslation });
  }

  openLogsModal(): void {
    const w = this.word();
    if (!w?.id) return;
    this.dialog.open(VocabularyLogsModalComponent, {
      width: '600px',
      maxHeight: '80vh',
      data: { wordId: w.id } satisfies VocabularyLogsModalData,
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

  selectInfinitive(w: any): void {
    this.parentVerbChanged.emit(w.id ?? null);
    this.showInfinitivePicker.set(false);
  }

  clearInfinitive(): void {
    this.parentVerbChanged.emit(null);
  }

  infinitiveNextPage(): void { if (this.infinitiveCurrentPage() < this.infinitiveTotalPages()) this.infinitiveCurrentPage.update(p => p + 1); }
  infinitivePrevPage(): void { if (this.infinitiveCurrentPage() > 1) this.infinitiveCurrentPage.update(p => p - 1); }

  private setTmpError(msg: string): void {
    this.editError.set(msg);
    setTimeout(() => { if (this.editError() === msg) this.editError.set(null); }, 3000);
  }
}