import { Component, OnInit, signal, inject } from '@angular/core';
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
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { VocabularyService } from '../services/vocabulary.service';
import { TagService } from '../services/tag.service';
import { SettingsService } from '../services/settings.service';
import { VocabularyStatsHeaderComponent } from './components/vocabulary-stats-header.component';
import { VocabularyWordCardComponent } from './components/vocabulary-word-card.component';
import { VocabularyWordListModalComponent } from './components/vocabulary-word-list-modal.component';
import { VocabularySentenceModalComponent, VocabularySentenceModalData } from './components/vocabulary-sentence-modal.component';
import { VocabularyAiChatModalComponent, VocabularyAiChatModalData } from './components/vocabulary-ai-chat-modal.component';
import { VocabularyLogsModalComponent, VocabularyLogsModalData } from './components/vocabulary-logs-modal.component';
import { VocabularyCreateWordModalComponent } from './components/vocabulary-create-word-modal.component';
import { VocabularyEditWordModalComponent } from './components/vocabulary-edit-word-modal.component';

type VocabExerciseType = 'multiple-choice' | 'spell-word' | 'type-word';

@Component({
  selector: 'app-vocabulary-page',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    MatCardModule, MatButtonModule, MatIconModule, MatFormFieldModule, MatInputModule,
    MatSelectModule, MatChipsModule, MatProgressSpinnerModule, MatSnackBarModule, MatDialogModule,
    VocabularyStatsHeaderComponent, VocabularyWordCardComponent, VocabularyWordListModalComponent,
    VocabularyCreateWordModalComponent, VocabularyEditWordModalComponent,
  ],
  template: `
    <div style="padding: 24px; max-width: 900px; margin: 0 auto;">
      <!-- Stats Header -->
      <app-vocabulary-stats-header
        [totalWords]="words.length"
        [favoriteCount]="favoriteCount()"
        [sessionCorrect]="sessionCorrect"
        [sessionAttempts]="sessionAttempts"
        [sessionAccuracy]="sessionAccuracy()"
        (openWordList)="openWordList()"
        (createWord)="showCreateModal = true">
      </app-vocabulary-stats-header>

      <!-- Empty / Loading state -->
      @if (loading() && !currentWord) {
        <div style="text-align: center; padding: 60px;">
          <mat-spinner diameter="40" style="margin: 0 auto;"></mat-spinner>
          <p style="color: #888; margin-top: 16px;">Loading vocabulary...</p>
        </div>
      }
      @else if (!loading() && words.length === 0) {
        <div style="text-align: center; padding: 60px;">
          <mat-icon style="font-size: 64px; height: 64px; width: 64px; color: #3f51b5;">menu_book</mat-icon>
          <h2>No vocabulary words</h2>
          <p style="color: #888;">Add your first word to start practicing.</p>
          <button mat-raised-button color="primary" (click)="showCreateModal = true">
            <mat-icon>add</mat-icon> Add Word
          </button>
        </div>
      }
      @else if (!currentWord) {
        <div style="text-align: center; padding: 60px;">
          <mat-icon style="font-size: 64px; height: 64px; width: 64px; color: #4caf50;">check_circle</mat-icon>
          <h2>Practice Complete!</h2>
          <p style="color: #888;">You've practiced all available words.</p>
          <button mat-raised-button color="primary" (click)="restartSession()">
            <mat-icon>replay</mat-icon> Practice Again
          </button>
        </div>
      }

      <!-- Current Word Card -->
      @if (currentWord) {
        <app-vocabulary-word-card
          [word]="currentWord"
          [exerciseMode]="currentExerciseMode"
          [choices]="currentChoices"
          [availableLetters]="availableLetters"
          [selectedLetters]="selectedLetters"
          [typedAnswer]="typedAnswer"
          [showResult]="showResult"
          [isCorrect]="isCorrect"
          [isFavorite]="isCurrentFavorite()"
          [isMarkedForReview]="isCurrentMarkedForReview()"
          [canSubmit]="canSubmit()"
          [displayTags]="getDisplayTags()"
          (typedAnswerChange)="typedAnswer = $event"
          (selectChoice)="selectChoice($event)"
          (selectLetter)="selectLetter($event.letter, $event.index)"
          (removeLetter)="removeLetter($event)"
          (submitMCSpell)="submitMCSpellAnswer()"
          (submitType)="submitTypeAnswer()"
          (reset)="resetWord()"
          (skip)="skipWord()"
          (next)="nextWord()"
          (toggleFavorite)="toggleFavorite()"
          (toggleReview)="toggleReview()"
          (editWord)="openEditWord($event)">
        </app-vocabulary-word-card>
      }
    </div>

    <!-- Word List Modal -->
    @if (showWordList) {
      <app-vocabulary-word-list-modal
        [words]="filteredWords"
        [filterText]="filterText"
        [filterLanguage]="filterLanguage"
        [filterDifficulty]="filterDifficulty"
        (filterTextChange)="filterText = $event"
        (filterLanguageChange)="filterLanguage = $event"
        (filterDifficultyChange)="filterDifficulty = $event"
        (filterApply)="applyFilter()"
        (selectWord)="selectWord($event); showWordList = false"
        (editWord)="selectWord($event); showWordList = false; openEditWord($event)"
        (deleteWord)="deleteWord($event)"
        (close)="showWordList = false">
      </app-vocabulary-word-list-modal>
    }

    <!-- Create Word Modal -->
    <app-vocabulary-create-word-modal
      [isOpen]="showCreateModal"
      (closed)="showCreateModal = false"
      (created)="showCreateModal = false; load()">
    </app-vocabulary-create-word-modal>

    <!-- Edit Word Modal -->
    <app-vocabulary-edit-word-modal
      [isOpen]="showEditModal"
      [word]="editingWord"
      (closed)="showEditModal = false"
      (saved)="showEditModal = false; load()">
    </app-vocabulary-edit-word-modal>
  `,
})
export class VocabularyPageComponent implements OnInit {
  words: any[] = [];
  filteredWords: any[] = [];
  currentWord: any = null;

  currentExerciseMode: VocabExerciseType = 'multiple-choice';
  currentChoices: string[] = [];
  availableLetters: string[] = [];
  selectedLetters: string[] = [];
  typedAnswer = '';
  showResult = false;
  isCorrect = false;
  sessionCorrect = 0;
  sessionAttempts = 0;
  private usedIndices: number[] = [];

  filterText = ''; filterLanguage = ''; filterDifficulty = '';
  showWordList = false;
  showCreateModal = false;
  showEditModal = false;
  editingWord: any = null;

  loading = signal(false);
  favoriteCount = signal(0);

  private vocab = inject(VocabularyService);
  private settings = inject(SettingsService);
  private snackBar = inject(MatSnackBar);

  async ngOnInit() { await this.load(); }

  async load() {
    this.loading.set(true);
    try {
      const s = this.settings.get();
      this.words = await this.vocab.getAll(s.practiceLanguage, s.nativeLanguage);
      this.favoriteCount.set(this.words.filter((w: any) => w.tags?.includes('favorite')).length);
      this.applyFilter();
      if (this.words.length > 0 && !this.currentWord) this.pickNextWord();
    } catch { this.snackBar.open('Failed to load vocabulary', 'OK', { duration: 3000 }); }
    this.loading.set(false);
  }

  applyFilter() {
    let list = this.words;
    if (this.filterText) { const q = this.filterText.toLowerCase(); list = list.filter(w => (w.word || '').toLowerCase().includes(q) || (w.translation || '').toLowerCase().includes(q)); }
    if (this.filterLanguage) list = list.filter(w => (w.practiceLanguage || '') === this.filterLanguage);
    if (this.filterDifficulty) list = list.filter(w => w.difficulty === this.filterDifficulty);
    this.filteredWords = list;
  }

  sessionAccuracy() { return this.sessionAttempts === 0 ? 0 : Math.round((this.sessionCorrect / this.sessionAttempts) * 100); }
  getDisplayTags(): string[] { return (this.currentWord?.tags || []).filter((t: string) => !['favorite', 'review', 'ignore'].includes(t)); }
  isCurrentFavorite(): boolean { return this.currentWord?.tags?.includes('favorite') ?? false; }
  isCurrentMarkedForReview(): boolean { return this.currentWord?.tags?.includes('review') ?? false; }

  pickNextWord() {
    if (this.words.length === 0) { this.currentWord = null; return; }
    let remain = this.words.map((_, i) => i).filter(i => !this.usedIndices.includes(i));
    if (remain.length === 0) { this.usedIndices = []; remain = this.words.map((_, i) => i); }
    this.currentWord = this.words[remain[Math.floor(Math.random() * remain.length)]];
    this.usedIndices.push(this.words.indexOf(this.currentWord));
    this.setupWord();
  }

  selectWord(w: any) { this.currentWord = w; const idx = this.words.indexOf(w); if (idx >= 0) this.usedIndices = [idx]; this.setupWord(); }
  restartSession() { this.usedIndices = []; this.sessionCorrect = 0; this.sessionAttempts = 0; this.pickNextWord(); }

  setupWord() {
    this.showResult = false; this.typedAnswer = '';
    if (!this.currentWord) return;
    const types: VocabExerciseType[] = ['multiple-choice', 'spell-word', 'type-word'];
    this.currentExerciseMode = types[Math.floor(Math.random() * types.length)];
    if (this.currentExerciseMode === 'multiple-choice') this.setupMultipleChoice();
    else if (this.currentExerciseMode === 'spell-word') this.setupSpellWord();
    else this.setupTypeWord();
  }

  setupMultipleChoice() {
    const others = this.words.filter(w => w.id !== this.currentWord.id).map(w => w.translation);
    const shuffled = [...others].sort(() => Math.random() - 0.5).slice(0, 3);
    this.currentChoices = [...shuffled, this.currentWord.translation].sort(() => Math.random() - 0.5);
  }

  setupSpellWord() {
    const letters = this.currentWord.word.split('');
    this.availableLetters = [...letters].sort(() => Math.random() - 0.5);
    this.selectedLetters = [];
  }

  setupTypeWord() { this.typedAnswer = ''; }

  selectChoice(index: number) {
    if (this.showResult) return;
    this.sessionAttempts++;
    this.isCorrect = this.currentChoices[index] === this.currentWord.translation;
    if (this.isCorrect) this.sessionCorrect++;
    this.showResult = true;
    this.updateStats(this.isCorrect, this.currentExerciseMode);
  }

  selectLetter(letter: string, index: number) { this.selectedLetters.push(letter); this.availableLetters.splice(index, 1); }
  removeLetter(index: number) { this.availableLetters.push(this.selectedLetters.splice(index, 1)[0]); }

  canSubmit(): boolean {
    if (this.currentExerciseMode === 'spell-word') return this.selectedLetters.length > 0 && this.availableLetters.length === 0;
    return false;
  }

  submitMCSpellAnswer() {
    if (this.currentExerciseMode !== 'spell-word') return;
    this.sessionAttempts++;
    this.isCorrect = this.selectedLetters.join('').toLowerCase().trim() === this.currentWord.word.toLowerCase().trim();
    if (this.isCorrect) this.sessionCorrect++;
    this.showResult = true;
    this.updateStats(this.isCorrect, 'spell-word');
  }

  submitTypeAnswer() {
    if (!this.typedAnswer.trim()) return;
    this.sessionAttempts++;
    this.isCorrect = this.typedAnswer.trim().toLowerCase() === this.currentWord.word.toLowerCase().trim();
    if (this.isCorrect) this.sessionCorrect++;
    this.showResult = true;
    this.updateStats(this.isCorrect, 'type-word');
  }

  async updateStats(correct: boolean, exerciseType: string) {
    if (!this.currentWord?.id) return;
    try {
      await this.vocab.updateStats(this.currentWord.id, correct, exerciseType);
      const idx = this.words.findIndex(w => w.id === this.currentWord.id);
      if (idx >= 0) { this.words[idx] = { ...this.words[idx], practiceCount: (this.words[idx].practiceCount || 0) + 1, correctCount: (this.words[idx].correctCount || 0) + (correct ? 1 : 0) }; }
    } catch {}
  }

  resetWord() { this.setupWord(); }
  skipWord() { this.pickNextWord(); }
  nextWord() { this.pickNextWord(); }

  async toggleFavorite() {
    if (!this.currentWord?.id) return;
    const tags = [...(this.currentWord.tags || [])];
    const idx = tags.indexOf('favorite'); idx >= 0 ? tags.splice(idx, 1) : tags.push('favorite');
    try {
      await this.vocab.update(this.currentWord.id, { ...this.currentWord, tags });
      this.currentWord.tags = tags;
      const i = this.words.findIndex(w => w.id === this.currentWord.id);
      if (i >= 0) this.words[i] = { ...this.words[i], tags };
      this.favoriteCount.set(this.words.filter((w: any) => w.tags?.includes('favorite')).length);
    } catch {}
  }

  async toggleReview() {
    if (!this.currentWord?.id) return;
    const tags = [...(this.currentWord.tags || [])];
    const idx = tags.indexOf('review'); idx >= 0 ? tags.splice(idx, 1) : tags.push('review');
    try {
      await this.vocab.update(this.currentWord.id, { ...this.currentWord, tags });
      this.currentWord.tags = tags;
      const i = this.words.findIndex(w => w.id === this.currentWord.id);
      if (i >= 0) this.words[i] = { ...this.words[i], tags };
    } catch {}
  }

  openWordList() { this.applyFilter(); this.showWordList = true; }
  openEditWord(w: any) { this.editingWord = w; this.showEditModal = true; }

  async deleteWord(w: any) {
    if (!confirm(`Delete "${w.word}"?`)) return;
    try { await this.vocab.delete(w.id); await this.load(); this.snackBar.open('Deleted', 'OK', { duration: 2000 }); if (this.currentWord?.id === w.id) this.pickNextWord(); }
    catch { this.snackBar.open('Failed to delete', 'OK', { duration: 3000 }); }
  }
}
