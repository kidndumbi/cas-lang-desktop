import { Component, OnInit, signal, effect, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ExerciseService } from '../../services/exercise.service';
import { TagService } from '../../services/tag.service';
import { SettingsService } from '../../services/settings.service';
import { LlmService } from '../../services/llm.service';
import { ExerciseStatsHeaderComponent } from './exercise-stats-header.component';
import { TagManagementModalComponent, TagManagementModalData } from './tag-management-modal.component';
import { ExerciseListModalComponent, ExerciseListModalData } from './exercise-list-modal.component';
import { CreateExerciseModalComponent, CreateExerciseModalData } from './create-exercise-modal.component';
import { EditExerciseModalComponent, EditExerciseModalData } from './edit-exercise-modal.component';
import { ExerciseLogsModalComponent, ExerciseLogsModalData } from './exercise-logs-modal.component';

type PracticeMode = 'arrange-words' | 'fill-in-missing' | 'spell-the-blanks' | 'conversation';
type FillPart = { text: string; isBlank: boolean; blankIdx: number };

interface ConversationChallenge {
  line1: string;
  options: string[];
  correctIndex: number;
}

@Component({
  selector: 'app-language-learning-page',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    MatCardModule, MatButtonModule, MatIconModule, MatChipsModule, MatSnackBarModule, MatDialogModule, MatProgressSpinnerModule,
    ExerciseStatsHeaderComponent,
  ],
  template: `
    <div style="padding: 24px; max-width: 900px; margin: 0 auto;">
      <!-- Stats Header -->
      @if (exercises.length > 0) {
        <app-exercise-stats-header
          [totalExercises]="exercises.length"
          [favoriteCount]="favoriteCount()"
          [sessionCorrect]="sessionCorrect"
          [sessionAttempts]="sessionAttempts"
          [loading]="loading()"
          (openExerciseList)="openExerciseListDialog()"
          (openTagManagement)="openTagManagementDialog()"
          (openCreateExercise)="openCreateExerciseDialog()">
        </app-exercise-stats-header>
      }

      <!-- Empty state -->
      @if (!exercise) {
        <div style="text-align: center; padding: 60px 20px;">
          <mat-icon style="font-size: 64px; height: 64px; width: 64px; color: #3f51b5;">school</mat-icon>
          @if (exercises.length === 0) {
            <h2>No exercises available</h2>
          }
          @if (exercises.length > 0) {
            <h2>Practice Complete!</h2>
          }
          <p style="color: #888;">
            {{ exercises.length === 0 ? 'Use the Cassava Theater migration tool to import your data.' : 'Great job! You\'ve practiced all available exercises.' }}
          </p>
          @if (exercises.length > 0) {
            <button mat-raised-button color="primary" (click)="restartSession()">
              <mat-icon>replay</mat-icon> Practice Again
            </button>
          }
        </div>
      }

      <!-- Exercise Card -->
      @if (exercise) {
        <mat-card style="margin-bottom: 16px;">
          <mat-card-content style="padding: 24px;">
            <!-- Header: language chip + difficulty + tags + action buttons -->
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
              <div style="display: flex; flex-wrap: wrap; gap: 8px; align-items: center;">
                <mat-chip-set role="list">
                  <mat-chip-row role="listitem">{{ settings.practiceLanguage | uppercase }} → {{ settings.nativeLanguage | uppercase }}</mat-chip-row>
                </mat-chip-set>
                @if (exercise.difficulty) {
                  <span [style.background]="getDifficultyColor(exercise.difficulty)" style="color: white; padding: 2px 10px; border-radius: 12px; font-size: 0.8em;">{{ exercise.difficulty }}</span>
                }
                @for (tag of getDisplayTags(); track tag) {
                  <span style="background: #e3f2fd; padding: 2px 8px; border-radius: 10px; font-size: 0.75em; color: #1565c0;">{{ tag }}</span>
                }
              </div>
              <div style="display: flex; gap: 2px; flex-shrink: 0;">
                <button mat-icon-button [color]="isFavorite() ? 'warn' : ''" (click)="toggleFavorite()" title="Favorite">
                  <mat-icon>{{ isFavorite() ? 'star' : 'star_border' }}</mat-icon>
                </button>
                <button mat-icon-button [color]="isMarkedForReview() ? 'primary' : ''" (click)="toggleReview()" title="Mark for review">
                  <mat-icon>{{ isMarkedForReview() ? 'bookmark' : 'bookmark_border' }}</mat-icon>
                </button>
                <button mat-icon-button color="primary" (click)="openEditExerciseDialog(exercise)" title="Edit exercise">
                  <mat-icon>edit</mat-icon>
                </button>
              </div>
            </div>
            <div style="font-size: 0.8em; color: #666; margin-bottom: 16px;">
              Mode: {{ getModeName() }} · {{ (exercise.wordCount || exercise['word_count'] || 0) }} words
            </div>

            <div style="background: #e8eaf6; border-radius: 8px; padding: 16px; margin-bottom: 20px;">
              <div style="font-size: 0.8em; color: #5c6bc0; margin-bottom: 4px;">Reference ({{ settings.nativeLanguage | uppercase }})</div>
              <div style="font-size: 1.1em; font-weight: 500;">{{ exercise.nativeLanguageText || exercise['native_language_text'] }}</div>
            </div>

            @if (currentMode === 'conversation') {
              <!-- Dialogue Practice mode -->
              @if (isGeneratingConversation()) {
                <div style="display: flex; align-items: center; gap: 12px; padding: 24px; justify-content: center;">
                  <mat-spinner diameter="24"></mat-spinner>
                  <span style="color: #888;">Generating dialogue...</span>
                </div>
              }
              @else if (conversationChallenge()) {
                <div>
                  <div style="font-size: 0.85em; color: #888; margin-bottom: 4px;">A says:</div>
                  <div style="background: #f5f5f5; border: 2px solid #9e9e9e; border-radius: 8px; padding: 16px; margin-bottom: 20px; display: flex; align-items: flex-start; gap: 8px;">
                    <div style="flex: 1; font-size: 1.05rem; font-weight: 500; line-height: 1.5;">{{ conversationChallenge()!.line1 }}</div>
                    <button mat-icon-button matTooltip="Copy" (click)="copyText(conversationChallenge()!.line1)" style="flex-shrink: 0;">
                      <mat-icon style="font-size: 18px;">content_copy</mat-icon>
                    </button>
                  </div>
                  <div style="font-size: 0.85em; color: #888; margin-bottom: 8px;">B responds with:</div>
                  @for (option of conversationChallenge()!.options; track $index) {
                    <div style="margin-bottom: 10px;">
                      <button mat-stroked-button
                        [style.background]="getConversationBg($index)"
                        [style.color]="showResult && (conversationChallenge()!.correctIndex === $index || selectedConversationIndex === $index) ? 'white' : ''"
                        [style.border-color]="getConversationBorder($index)"
                        [disabled]="showResult"
                        (click)="selectConversationOption($index)"
                        style="width: 100%; justify-content: flex-start; padding: 12px 16px; height: auto; white-space: normal; text-align: left; line-height: 1.4;">
                        {{ option }}
                      </button>
                    </div>
                  }
                </div>
              }
              @else {
                <div style="display: flex; justify-content: center; padding: 24px; color: #888;">
                  Could not generate dialogue. Try next exercise.
                </div>
              }
            }

            @if (currentMode === 'arrange-words') {
              <div>
                <div style="font-size: 0.8em; color: #888; margin-bottom: 8px;">Arrange the words in correct order:</div>
                @if (selectedWords.length > 0) {
                  <div style="min-height: 48px; border: 2px dashed #3f51b5; border-radius: 8px; padding: 8px; margin-bottom: 12px; display: flex; flex-wrap: wrap; gap: 6px; background: #f3f5ff;">
                    <mat-chip-set role="list">
                      @for (w of selectedWords; track $index; let i = $index) {
                        <mat-chip-row (click)="removeWord(i)" color="primary" highlighted role="listitem" style="cursor: pointer;">{{ w }}</mat-chip-row>
                      }
                    </mat-chip-set>
                  </div>
                }
                @if (selectedWords.length === 0) {
                  <div style="min-height: 48px; border: 2px dashed #ccc; border-radius: 8px; padding: 8px; margin-bottom: 12px; display: flex; align-items: center; justify-content: center; color: #aaa;">Tap words below to arrange them here</div>
                }
                <mat-chip-set role="list" style="display: flex; flex-wrap: wrap; gap: 6px;">
                  @for (w of availableWords; track $index; let i = $index) {
                    <mat-chip-row (click)="selectWord(w, i)" color="accent" role="listitem" style="cursor: pointer;">{{ w }}</mat-chip-row>
                  }
                </mat-chip-set>
              </div>
            }

            @if (currentMode === 'fill-in-missing') {
              <div>
                <div style="font-size: 0.8em; color: #888; margin-bottom: 8px;">Click words from the bank to fill the blanks (click a filled blank to return it):</div>
                <div style="font-size: 1.1em; line-height: 2.8; margin-bottom: 16px;">
                  @for (part of fillTemplate; track $index) {
                    @if (!part.isBlank) {
                      <span style="margin: 0 2px;">{{ part.text }}</span>
                    }
                    @if (part.isBlank) {
                      <span
                        (click)="clearBlank(part.blankIdx)"
                        [style.border-color]="filledBlanks[part.blankIdx] ? '#3f51b5' : '#bbb'"
                        [style.background]="filledBlanks[part.blankIdx] ? '#e8eaf6' : '#fafafa'"
                        [style.color]="filledBlanks[part.blankIdx] ? '#1a237e' : '#bbb'"
                        style="display: inline-block; min-width: 80px; padding: 2px 12px; border: 2px solid; border-radius: 16px; cursor: pointer; margin: 0 4px; text-align: center; vertical-align: middle; transition: all 0.15s;">
                        {{ filledBlanks[part.blankIdx] || '?' }}
                      </span>
                    }
                  }
                </div>
                @if (fillWordBank.length > 0) {
                  <div style="font-size: 0.8em; color: #888; margin-bottom: 6px;">Word bank:</div>
                  <mat-chip-set style="display: flex; flex-wrap: wrap; gap: 6px;">
                    @for (w of fillWordBank; track $index; let i = $index) {
                      <mat-chip-row (click)="fillBlank(w, i)" color="accent" style="cursor: pointer;">{{ w }}</mat-chip-row>
                    }
                  </mat-chip-set>
                }
              </div>
            }

            @if (currentMode === 'spell-the-blanks') {
              <div>
                <div style="font-size: 0.8em; color: #888; margin-bottom: 8px;">Type the missing words from memory:</div>
                <div style="font-size: 1.15em; line-height: 2.2;">
                  @for (part of spellTemplate; track $index) {
                    @if (part.isBlank) {
                      <input type="text" [value]="spellAnswers[part.blankIdx] || ''" (input)="onSpellChange($event, part.blankIdx)" placeholder="?"
                        style="width: 80px; padding: 4px 8px; border: 2px solid #e91e63; border-radius: 4px; text-align: center; font-size: 1em; margin: 0 4px;" autocomplete="off" spellcheck="false">
                    }
                    @if (!part.isBlank) {
                      <span style="margin: 0 2px;">{{ part.text }}</span>
                    }
                  }
                </div>
              </div>
            }

            @if (showResult) {
              <div style="margin-top: 16px; border-radius: 8px; padding: 16px;"
                [style.background]="isCorrect ? '#e8f5e9' : '#fbe9e7'">
                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                  <mat-icon [style.color]="isCorrect ? '#2e7d32' : '#c62828'">{{ isCorrect ? 'check_circle' : 'cancel' }}</mat-icon>
                  <strong [style.color]="isCorrect ? '#2e7d32' : '#c62828'">{{ isCorrect ? 'Correct!' : 'Incorrect' }}</strong>
                </div>
                @if (!isCorrect && currentMode !== 'conversation') {
                  <div style="font-size: 0.9em; color: #666;">
                    Correct answer: <strong>{{ exercise.practiceLanguageText || exercise['practice_language_text'] }}</strong>
                  </div>
                }
                @if (!isCorrect && currentMode === 'conversation') {
                  <div style="font-size: 0.9em; color: #666;">
                    The correct response is highlighted in green above.
                  </div>
                }
              </div>
            }

            @if (!showResult && currentMode !== 'conversation') {
              <div style="margin-top: 16px; display: flex; gap: 8px;">
                <button mat-raised-button color="primary" (click)="submitAnswer()" [disabled]="!canSubmit()">
                  <mat-icon>check</mat-icon> Check Answer
                </button>
                <button mat-button (click)="resetExercise()"><mat-icon>refresh</mat-icon> Reset</button>
              </div>
            }
            @if (showResult || currentMode === 'conversation') {
              <div style="margin-top: 16px; display: flex; gap: 8px;">
                @if (showResult) {
                  <button mat-raised-button color="primary" (click)="nextExercise()"><mat-icon>chevron_right</mat-icon> Next Exercise</button>
                }
                <button mat-button (click)="resetExercise()"><mat-icon>replay</mat-icon> Retry</button>
              </div>
            }
            @if (exercise.videoFileName) {
              <div style="margin-top: 12px; font-size: 0.75em; color: #aaa;">From: {{ exercise.videoFileName }}</div>
            }
          </mat-card-content>
        </mat-card>
      }
    </div>
  `,
})
export class LanguageLearningPageComponent implements OnInit {
  exercises: any[] = [];
  exercise: any = null;
  settings: any;
  currentMode: PracticeMode = 'arrange-words';
  availablePracticeTypes: string[] = [];

  // Practice state
  availableWords: string[] = [];
  selectedWords: string[] = [];
  fillTemplate: FillPart[] = [];
  filledBlanks: (string | null)[] = [];
  fillWordBank: string[] = [];
  spellTemplate: FillPart[] = [];
  spellAnswers: string[] = [];
  showResult = false;
  isCorrect = false;
  sessionCorrect = 0;
  sessionAttempts = 0;
  private usedIndices: number[] = [];

  // Conversation state
  conversationChallenge = signal<ConversationChallenge | null>(null);
  isGeneratingConversation = signal(false);
  selectedConversationIndex: number | null = null;

  // Signals
  loading = signal(false);
  favoriteCount = signal(0);
  allTags = signal<string[]>([]);
  isAddingTag = signal(false);
  isDeletingTag = signal(false);
  tagError = signal('');
  isSavingExercise = signal(false);
  createError = signal('');

  // Exercise list filtering/pagination
  paginatedExercises = signal<any[]>([]);
  totalPages = signal(1);
  currentPage = signal(1);
  uniqueExerciseTags = signal<string[]>([]);
  selectedTagFilters = signal<string[]>([]);
  private filters: any = { searchText: '', practiceLanguage: 'all', nativeLanguage: 'all', difficulty: 'all', practiceStatus: 'all' };
  private pageSize = 20;

  private llmService = inject(LlmService);
  private exerciseService = inject(ExerciseService);
  private tagService = inject(TagService);
  private ss = inject(SettingsService);
  private snackBar = inject(MatSnackBar);
  private dialog = inject(MatDialog);

  constructor() {
    let practiceTypesInit = false;
    effect(() => {
      const types = this.ss.practiceTypes() as PracticeMode[];
      this.availablePracticeTypes = types.length > 0 ? types : ['arrange-words'];
      if (!this.availablePracticeTypes.includes(this.currentMode)) {
        this.currentMode = this.availablePracticeTypes[0] as PracticeMode;
      }
      if (!practiceTypesInit) { practiceTypesInit = true; return; }
      if (this.exercise) this.setupExercise();
    });
  }

  async ngOnInit() {
    this.settings = this.ss.get();
    this.loading.set(true);
    await Promise.all([this.loadExercises(), this.loadTags()]);
    this.loading.set(false);
    if (this.exercises.length > 0) this.pickRandomExercise();
  }

  async loadExercises() {
    try {
      this.exercises = await this.exerciseService.getAll(this.settings.practiceLanguage, this.settings.nativeLanguage);
      this.favoriteCount.set(this.exercises.filter((e: any) => e.isFavorite).length);
      this.uniqueExerciseTags.set([...new Set(this.exercises.flatMap((e: any) => e.tags || []))] as string[]);
      this.applyPagination();
    } catch (e) { console.error(e); }
  }

  async loadTags() {
    try { this.allTags.set(await this.tagService.getAll()); } catch {}
  }

  pickRandomExercise() {
    if (this.exercises.length === 0) { this.exercise = null; return; }
    let remain = this.exercises.map((_, i) => i).filter(i => !this.usedIndices.includes(i));
    if (remain.length === 0) { this.usedIndices = []; remain = this.exercises.map((_, i) => i); }
    this.exercise = this.exercises[remain[Math.floor(Math.random() * remain.length)]];
    this.usedIndices.push(this.exercises.indexOf(this.exercise));
    this.setupExercise();
  }

  setupExercise() {
    this.showResult = false;
    this.conversationChallenge.set(null);
    this.selectedConversationIndex = null;
    const text = this.exercise.practiceLanguageText || this.exercise['practice_language_text'] || '';
    const words = text.split(/\s+/).filter((w: string) => w.length > 0);
    // Pick random mode from available types
    const t = this.availablePracticeTypes;
    this.currentMode = t.length === 1 ? (t[0] as PracticeMode) : (t[Math.floor(Math.random() * t.length)] as PracticeMode);
    if (this.currentMode === 'conversation') {
      this.selectedWords = []; this.availableWords = [];
      this.fillTemplate = []; this.filledBlanks = []; this.fillWordBank = [];
      this.spellTemplate = []; this.spellAnswers = [];
      this.generateConversation();
    } else if (this.currentMode === 'arrange-words') {
      this.selectedWords = [];
      this.availableWords = this.shuffle([...words]);
    } else if (this.currentMode === 'fill-in-missing') {
      const blankCount = Math.max(1, Math.floor(words.length / 3));
      const shuffledIdx = [...Array(words.length).keys()].sort(() => Math.random() - 0.5);
      const blankSet = new Set(shuffledIdx.slice(0, blankCount));
      let fbi = 0;
      this.fillTemplate = words.map((w: string, idx: number) => {
        if (blankSet.has(idx)) return { text: w, isBlank: true, blankIdx: fbi++ };
        return { text: w, isBlank: false, blankIdx: -1 };
      });
      this.filledBlanks = new Array(blankCount).fill(null);
      this.fillWordBank = [...blankSet].map(i => words[i]).sort(() => Math.random() - 0.5);
      this.spellTemplate = []; this.spellAnswers = [];
    } else {
      const blankCount = Math.min(2, words.length);
      const shuffledIdx = [...Array(words.length).keys()].sort(() => Math.random() - 0.5);
      const blankSet = new Set(shuffledIdx.slice(0, blankCount));
      let sbi = 0;
      this.spellTemplate = words.map((w: string, idx: number) => {
        if (blankSet.has(idx)) return { text: w, isBlank: true, blankIdx: sbi++ };
        return { text: w, isBlank: false, blankIdx: -1 };
      });
      this.spellAnswers = new Array(blankCount).fill('');
      this.fillTemplate = []; this.filledBlanks = []; this.fillWordBank = [];
    }
  }

  selectWord(w: string, i: number) { this.selectedWords.push(w); this.availableWords.splice(i, 1); }
  removeWord(i: number) { const w = this.selectedWords.splice(i, 1)[0]; this.availableWords.push(w); }
  onSpellChange(e: Event, i: number) { this.spellAnswers[i] = (e.target as HTMLInputElement).value; }

  fillBlank(word: string, wordIdx: number) {
    const emptyIdx = this.filledBlanks.findIndex(b => b === null);
    if (emptyIdx >= 0) { this.filledBlanks[emptyIdx] = word; this.fillWordBank = this.fillWordBank.filter((_, i) => i !== wordIdx); }
  }

  clearBlank(blankIdx: number) {
    const word = this.filledBlanks[blankIdx];
    if (word !== null && word !== undefined) { this.fillWordBank = [...this.fillWordBank, word]; this.filledBlanks[blankIdx] = null; }
  }

  isFavorite(): boolean { return this.exercise?.tags?.includes('favorite') ?? false; }
  isMarkedForReview(): boolean { return this.exercise?.tags?.includes('review') ?? false; }
  getDifficultyColor(d?: string): string {
    return d === 'easy' ? '#4caf50' : d === 'medium' ? '#ff9800' : '#f44336';
  }
  getDisplayTags(): string[] {
    return (this.exercise?.tags || []).filter((t: string) => !['favorite', 'review', 'ignore'].includes(t));
  }

  async copyText(text: string): Promise<void> {
    if (!text) return;
    try { await navigator.clipboard.writeText(text); } catch {}
  }

  getConversationBg(index: number): string {
    if (!this.showResult) return '';
    const challenge = this.conversationChallenge();
    if (!challenge) return '';
    if (index === challenge.correctIndex) return '#4caf50';
    if (index === this.selectedConversationIndex && index !== challenge.correctIndex) return '#f44336';
    return '';
  }

  getConversationBorder(index: number): string {
    if (!this.showResult) return '';
    const challenge = this.conversationChallenge();
    if (!challenge) return '';
    if (index === challenge.correctIndex) return '#388e3c';
    if (index === this.selectedConversationIndex && index !== challenge.correctIndex) return '#d32f2f';
    return '';
  }

  async generateConversation(): Promise<void> {
    const ex = this.exercise;
    if (!ex) return;
    this.isGeneratingConversation.set(true);
    this.conversationChallenge.set(null);

    const langName = (code: string) => code === 'es' ? 'Spanish' : code === 'fr' ? 'French' : 'English';
    const practiceLang = langName(ex.practiceLanguage || ex['practice_language'] || 'en');
    const practiceText = ex.practiceLanguageText || ex['practice_language_text'] || '';
    const prompt = `You are a language learning assistant. Create a short two-line dialogue loosely inspired by this ${practiceLang} sentence: "${practiceText}"\n\nThe dialogue should be in ${practiceLang}. Line 1 is a question or statement from person A. Provide 4 possible responses for person B where only ONE is natural and correct. The other 3 wrong options must be CLEARLY wrong.\n\nRespond ONLY with valid JSON: {"line1":"...","options":["correct","wrong","wrong","wrong"],"correctIndex":0}. Shuffle the options.`;

    try {
      const raw = await this.llmService.generateWithDeepseek(prompt);
      const jsonStr = raw.replace(/```json|```/g, '').trim();
      const parsed = JSON.parse(jsonStr) as ConversationChallenge;
      if (parsed.line1 && Array.isArray(parsed.options) && parsed.options.length === 4) {
        const correct = parsed.options[parsed.correctIndex];
        const shuffled = [...parsed.options].sort(() => Math.random() - 0.5);
        this.conversationChallenge.set({ line1: parsed.line1, options: shuffled, correctIndex: shuffled.indexOf(correct) });
      }
    } catch {
      this.conversationChallenge.set(null);
    } finally {
      this.isGeneratingConversation.set(false);
    }
  }

  selectConversationOption(index: number): void {
    if (this.showResult) return;
    const challenge = this.conversationChallenge();
    if (!challenge) return;

    this.selectedConversationIndex = index;
    this.sessionAttempts++;

    const correct = index === challenge.correctIndex;
    this.isCorrect = correct;
    if (correct) this.sessionCorrect++;
    this.showResult = true;

    const snapshot = {
      userAnswer: challenge.options[index],
      correctAnswer: challenge.options[challenge.correctIndex],
      nativeText: this.exercise.nativeLanguageText || this.exercise['native_language_text'] || '',
      practiceMode: this.currentMode,
      options: challenge.options,
    };
    try {
      this.exerciseService.updateStats(
        this.exercise.id || this.exercise['id'],
        correct,
        snapshot,
      );
    } catch {}
  }

  async toggleFavorite() {
    if (!this.exercise?.id) return;
    const tags = [...(this.exercise.tags || [])];
    const idx = tags.indexOf('favorite');
    if (idx >= 0) tags.splice(idx, 1); else tags.push('favorite');
    try {
      await this.exerciseService.update(this.exercise.id, { ...this.exercise, tags });
      this.exercise = { ...this.exercise, tags };
      const i = this.exercises.findIndex((e: any) => e.id === this.exercise.id);
      if (i >= 0) this.exercises[i] = this.exercise;
      this.favoriteCount.set(this.exercises.filter((e: any) => e.tags?.includes('favorite')).length);
    } catch {}
  }

  async toggleReview() {
    if (!this.exercise?.id) return;
    const tags = [...(this.exercise.tags || [])];
    const idx = tags.indexOf('review');
    if (idx >= 0) tags.splice(idx, 1); else tags.push('review');
    try {
      await this.exerciseService.update(this.exercise.id, { ...this.exercise, tags });
      this.exercise = { ...this.exercise, tags };
      const i = this.exercises.findIndex((e: any) => e.id === this.exercise.id);
      if (i >= 0) this.exercises[i] = this.exercise;
    } catch {}
  }

  canSubmit(): boolean {
    if (this.currentMode === 'arrange-words') return this.selectedWords.length > 0 && this.availableWords.length === 0;
    if (this.currentMode === 'fill-in-missing') return this.filledBlanks.every(b => b !== null);
    return this.spellAnswers.every(a => a.trim().length > 0);
  }

  async submitAnswer() {
    this.showResult = true; this.sessionAttempts++;
    const normalizeAnswer = (ans: string) => ans.normalize('NFD').replace(/[.,!?;:"'\-¿¡]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
    const answer = normalizeAnswer(this.exercise.practiceLanguageText || this.exercise['practice_language_text'] || '');
    let user = '';
    if (this.currentMode === 'arrange-words') {
      user = this.selectedWords.join(' ');
    } else if (this.currentMode === 'fill-in-missing') {
      const parts: string[] = [];
      for (const p of this.fillTemplate) {
        const t = p.isBlank ? (this.filledBlanks[p.blankIdx] || '') : p.text.trim();
        if (t) parts.push(t);
      }
      user = parts.join(' ');
    } else {
      const parts: string[] = [];
      for (const p of this.spellTemplate) {
        const t = p.isBlank ? (this.spellAnswers[p.blankIdx] || '') : p.text.trim();
        if (t) parts.push(t);
      }
      user = parts.join(' ');
    }
    const normalizedUser = normalizeAnswer(user);
    this.isCorrect = normalizedUser === answer;
    if (this.isCorrect) this.sessionCorrect++;
    const snapshot = { userAnswer: user, correctAnswer: this.exercise.practiceLanguageText || '', nativeText: this.exercise.nativeLanguageText || '', practiceMode: this.currentMode };
    try { await this.exerciseService.updateStats(this.exercise.id || this.exercise['id'], this.isCorrect, snapshot); } catch {}
  }

  resetExercise() { this.setupExercise(); }
  nextExercise() {
    this.pickRandomExercise();
    if (this.currentMode === 'conversation') {
      this.generateConversation();
    }
  }
  restartSession() { this.usedIndices = []; this.sessionCorrect = 0; this.sessionAttempts = 0; this.pickRandomExercise(); }

  toggleMode() {
    const idx = this.availablePracticeTypes.indexOf(this.currentMode);
    this.currentMode = this.availablePracticeTypes[(idx + 1) % this.availablePracticeTypes.length] as PracticeMode;
    this.setupExercise();
  }

  getModeName() {
    if (this.currentMode === 'arrange-words') return 'Arrange Words';
    if (this.currentMode === 'fill-in-missing') return 'Fill in Missing';
    if (this.currentMode === 'spell-the-blanks') return 'Spell the Blanks';
    return 'Dialogue Practice';
  }

  // ─── Dialog Openers ──────────────────────────────────────────

  private exerciseListData?: ExerciseListModalData;
  private exerciseListDialogRef?: any;

  openTagManagementDialog() {
    const dialogRef = this.dialog.open(TagManagementModalComponent, {
      width: '500px',
      data: {
        allTags: this.allTags(),
        isAddingTag: this.isAddingTag(),
        isDeletingTag: this.isDeletingTag(),
        tagError: this.tagError(),
        onAddTag: (tag: string) => this.addTag(tag),
        onDeleteTag: (tag: string) => this.deleteTag(tag),
      } satisfies TagManagementModalData,
    });
  }

  openExerciseListDialog() {
    const dialogRef = this.dialog.open(ExerciseListModalComponent, {
      width: '900px',
      maxHeight: '80vh',
    });
    this.exerciseListDialogRef = dialogRef;
    this.exerciseListData = {
      totalExercises: this.exercises.length,
      paginatedExercises: [...this.paginatedExercises()],
      totalPages: this.totalPages(),
      currentPage: this.currentPage(),
      uniqueTags: [...this.uniqueExerciseTags()],
      selectedTags: [...this.selectedTagFilters()],
      refresh: () => this.refreshExerciseListDialog(),
      onSelectExercise: (ex: any) => this.selectExercise(ex),
      onEditExercise: (ex: any) => this.editExercise(ex),
      onDeleteExercise: (ex: any) => this.deleteExercise(ex),
      onUpdateFilter: (key: string, value: string) => this.updateFilter(key, value),
      onClearFilters: () => this.clearFilters(),
      onToggleTagFilter: (tag: string) => this.toggleTagFilter(tag),
      onGoToNextPage: () => this.goToNextPage(),
      onGoToPreviousPage: () => this.goToPreviousPage(),
      onGoToFirstPage: () => this.goToFirstPage(),
      onGoToLastPage: () => this.goToLastPage(),
      isFavorite: (ex: any) => ex?.tags?.includes('favorite') ?? false,
      isMarkedForReview: (ex: any) => ex?.tags?.includes('review') ?? false,
    };
    dialogRef.componentInstance.data = this.exerciseListData;
  }

  refreshExerciseListDialog() {
    if (!this.exerciseListData || !this.exerciseListDialogRef) return;
    // Mutate in-place so the dialog's data reference sees the changes
    this.exerciseListData.totalExercises = this.exercises.length;
    this.exerciseListData.paginatedExercises = [...this.paginatedExercises()];
    this.exerciseListData.totalPages = this.totalPages();
    this.exerciseListData.currentPage = this.currentPage();
    this.exerciseListData.uniqueTags = [...this.uniqueExerciseTags()];
    this.exerciseListData.selectedTags = [...this.selectedTagFilters()];
    this.exerciseListDialogRef.componentInstance.cdr.detectChanges();
  }

  openCreateExerciseDialog() {
    const dialogRef = this.dialog.open(CreateExerciseModalComponent, {
      width: '600px',
      data: {
        allTags: this.allTags(),
        isSaving: this.isSavingExercise(),
        error: this.createError(),
        onSaved: (data: any) => this.handleCreateExercise(data),
      } satisfies CreateExerciseModalData,
    });
  }

  // ─── Tag Management ──────────────────────────────────────────

  async addTag(tag: string) {
    if (!tag.trim()) return;
    this.isAddingTag.set(true);
    try {
      await this.tagService.add(tag.trim());
      await this.loadTags();
      this.snackBar.open('Tag added', 'OK', { duration: 2000 });
    } catch {
      this.tagError.set('Failed to add tag');
    } finally { this.isAddingTag.set(false); }
  }

  async deleteTag(tag: string) {
    this.isDeletingTag.set(true);
    try {
      await this.tagService.delete(tag);
      await this.loadTags();
      this.snackBar.open('Tag deleted', 'OK', { duration: 2000 });
    } catch {
      this.tagError.set('Failed to delete tag');
    } finally { this.isDeletingTag.set(false); }
  }

  // ─── Exercise List Modal ─────────────────────────────────────

  selectExercise(ex: any) {
    this.exercise = ex;
    this.usedIndices = [this.exercises.indexOf(ex)];
    this.setupExercise();
    this.dialog.closeAll();
  }

  async deleteExercise(ex: any) {
    if (!confirm(`Delete "${ex.practiceLanguageText || ex['practice_language_text']}"?`)) return;
    try {
      await this.exerciseService.delete(ex.id || ex['id']);
      this.loadExercises();
      this.snackBar.open('Deleted', 'OK', { duration: 2000 });
    } catch { this.snackBar.open('Failed to delete', 'OK', { duration: 3000 }); }
  }

  async editExercise(ex: any) { this.openEditExerciseDialog(ex); }

  openExerciseLogsDialog(exerciseId: string) {
    this.dialog.open(ExerciseLogsModalComponent, {
      width: '600px',
      maxHeight: '80vh',
      data: {
        exerciseId,
      } satisfies ExerciseLogsModalData,
    });
  }

  openEditExerciseDialog(ex: any) {
    const isSaving = { value: false };
    const error = { value: '' };
    const dialogRef = this.dialog.open(EditExerciseModalComponent, {
      width: '600px',
      data: {
        exercise: ex,
        allTags: this.allTags(),
        get isSaving() { return isSaving.value; },
        get error() { return error.value; },
        onSaved: async (updated: any) => {
          isSaving.value = true;
          try {
            await this.exerciseService.update(ex.id || ex['id'], updated);
            dialogRef.close();
            if (this.exercise?.id === (ex.id || ex['id'])) {
              this.exercise = { ...this.exercise, ...updated };
              this.setupExercise();
            }
            await this.loadExercises();
            this.snackBar.open('Exercise updated', 'OK', { duration: 2000 });
          } catch { error.value = 'Failed to update exercise'; }
          finally { isSaving.value = false; }
        },
        onDelete: (exercise: any) => {
          dialogRef.close();
          this.deleteExercise(exercise);
        },
        onViewLogs: (exercise: any) => {
          const exId = exercise.id || exercise['id'];
          console.log('[LanguageLearningPage] View logs requested for exercise:', exId);
          this.openExerciseLogsDialog(exId);
        },
      } satisfies EditExerciseModalData,
    });
  }

  updateFilter(key: string, value: string) {
    this.filters[key] = value;
    this.applyPagination();
  }

  clearFilters() {
    this.filters = { searchText: '', practiceLanguage: 'all', nativeLanguage: 'all', difficulty: 'all', practiceStatus: 'all' };
    this.selectedTagFilters.set([]);
    this.applyPagination();
  }

  toggleTagFilter(tag: string) {
    const tags = [...this.selectedTagFilters()];
    const i = tags.indexOf(tag);
    if (i >= 0) tags.splice(i, 1); else tags.push(tag);
    this.selectedTagFilters.set(tags);
    this.applyPagination();
  }

  goToNextPage() { if (this.currentPage() < this.totalPages()) { this.currentPage.set(this.currentPage() + 1); this.applyPagination(); } }
  goToPreviousPage() { if (this.currentPage() > 1) { this.currentPage.set(this.currentPage() - 1); this.applyPagination(); } }
  goToFirstPage() { this.currentPage.set(1); this.applyPagination(); }
  goToLastPage() { this.currentPage.set(this.totalPages()); this.applyPagination(); }

  applyPagination() {
    let list = [...this.exercises];
    if (this.filters.searchText) {
      const q = this.filters.searchText.toLowerCase();
      list = list.filter((e: any) =>
        (e.practiceLanguageText || '').toLowerCase().includes(q) ||
        (e.nativeLanguageText || '').toLowerCase().includes(q));
    }
    if (this.filters.practiceLanguage && this.filters.practiceLanguage !== 'all') {
      list = list.filter((e: any) => e.practiceLanguage === this.filters.practiceLanguage);
    }
    if (this.filters.nativeLanguage && this.filters.nativeLanguage !== 'all') {
      list = list.filter((e: any) => e.nativeLanguage === this.filters.nativeLanguage);
    }
    if (this.filters.difficulty && this.filters.difficulty !== 'all') {
      list = list.filter((e: any) => e.difficulty === this.filters.difficulty);
    }
    if (this.filters.practiceStatus && this.filters.practiceStatus !== 'all') {
      switch (this.filters.practiceStatus) {
        case 'never': list = list.filter((e: any) => !e.practiceCount || e.practiceCount === 0); break;
        case 'low-accuracy': list = list.filter((e: any) => e.accuracyRate !== undefined && e.accuracyRate < 70); break;
        case 'high-accuracy': list = list.filter((e: any) => e.accuracyRate !== undefined && e.accuracyRate >= 70); break;
        case 'favorites': list = list.filter((e: any) => e.tags?.includes('favorite')); break;
      }
    }
    if (this.selectedTagFilters().length > 0) {
      list = list.filter((e: any) => {
        const t: string[] = e.tags || [];
        return this.selectedTagFilters().some(tf => t.includes(tf));
      });
    }
    this.totalPages.set(Math.max(1, Math.ceil(list.length / this.pageSize)));
    if (this.currentPage() > this.totalPages()) this.currentPage.set(this.totalPages());
    const start = (this.currentPage() - 1) * this.pageSize;
    this.paginatedExercises.set(list.slice(start, start + this.pageSize));
  }

  // ─── Create Exercise Modal ───────────────────────────────────

  async handleCreateExercise(data: any) {
    this.isSavingExercise.set(true);
    try {
      await this.exerciseService.create(data);
      this.snackBar.open('Exercise created', 'OK', { duration: 2000 });
      this.dialog.closeAll();
      this.loadExercises();
    } catch {
      this.createError.set('Failed to create exercise');
    } finally { this.isSavingExercise.set(false); }
  }

  private shuffle<T>(arr: T[]): T[] {
    for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; }
    return arr;
  }
}