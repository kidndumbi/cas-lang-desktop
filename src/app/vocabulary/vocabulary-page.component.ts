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
import { VocabularySentenceModalComponent, VocabularySentenceModalData } from './components/vocabulary-sentence-modal.component';
import { VocabularyAiChatModalComponent, VocabularyAiChatModalData } from './components/vocabulary-ai-chat-modal.component';
import { VocabularyLogsModalComponent, VocabularyLogsModalData } from './components/vocabulary-logs-modal.component';

type VocabExerciseType = 'multiple-choice' | 'spell-word' | 'type-word';

@Component({
  selector: 'app-vocabulary-page',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    MatCardModule, MatButtonModule, MatIconModule, MatFormFieldModule, MatInputModule,
    MatSelectModule, MatChipsModule, MatProgressSpinnerModule, MatSnackBarModule, MatDialogModule,
  ],
  template: `
    <div style="padding: 24px; max-width: 900px; margin: 0 auto;">
      <!-- Stats Header -->
      <div class="animate-fade-in" style="margin-bottom: 16px;">
        <mat-card>
          <mat-card-content style="display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; flex-wrap: wrap; gap: 12px;">
            <div style="display: flex; gap: 12px; align-items: center; flex-wrap: wrap;">
              <span style="font-weight: 500;">{{ words.length }} words</span>
              <span style="color: #f44336; font-size: 0.9em;">
                <mat-icon style="font-size: 16px; vertical-align: middle;">star</mat-icon> {{ favoriteCount() }}
              </span>
              <span style="font-size: 0.9em; color: #888;">
                Session: {{ sessionCorrect }}/{{ sessionAttempts }} ({{ sessionAccuracy() }}%)
              </span>
            </div>
            <div style="display: flex; gap: 8px;">
              <button mat-stroked-button (click)="openWordList()">
                <mat-icon>list</mat-icon> All Words
              </button>
              <button mat-stroked-button color="primary" (click)="openCreateWord()">
                <mat-icon>add</mat-icon> Add Word
              </button>
            </div>
          </mat-card-content>
        </mat-card>
      </div>

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
          <button mat-raised-button color="primary" (click)="openCreateWord()">
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
        <mat-card style="margin-bottom: 16px;">
          <mat-card-content style="padding: 24px;">
            <!-- Header -->
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px;">
              <div style="display: flex; flex-wrap: wrap; gap: 8px; align-items: center;">
                <span style="background: #3f51b5; color: white; padding: 2px 10px; border-radius: 12px; font-size: 0.8em;">
                  {{ currentWord.practiceLanguage | uppercase }}
                </span>
                @if (currentWord.difficulty) {
                  <span [style.background]="getDifficultyColor(currentWord.difficulty)" style="color: white; padding: 2px 10px; border-radius: 12px; font-size: 0.8em;">
                    {{ currentWord.difficulty }}
                  </span>
                }
                @for (tag of getDisplayTags(currentWord); track tag) {
                  <span style="background: #e3f2fd; padding: 2px 8px; border-radius: 10px; font-size: 0.75em; color: #1565c0;">{{ tag }}</span>
                }
              </div>
              <div style="display: flex; gap: 2px;">
                <button mat-icon-button [color]="isFavorite(currentWord) ? 'warn' : ''" (click)="toggleFavorite()" title="Favorite">
                  <mat-icon>{{ isFavorite(currentWord) ? 'star' : 'star_border' }}</mat-icon>
                </button>
                <button mat-icon-button [color]="isMarkedForReview(currentWord) ? 'primary' : ''" (click)="toggleReview()" title="Mark for review">
                  <mat-icon>{{ isMarkedForReview(currentWord) ? 'bookmark' : 'bookmark_border' }}</mat-icon>
                </button>
                <button mat-icon-button color="primary" (click)="openEditWord(currentWord)" title="Edit">
                  <mat-icon>edit</mat-icon>
                </button>
              </div>
            </div>

            <div style="font-size: 0.8em; color: #666; margin-bottom: 16px;">
              Mode: {{ getModeName() }} · {{ currentWord.practiceCount || 0 }}× practiced
              · {{ (currentWord.accuracyRate || 0) | number:'1.0-0' }}%
            </div>

            <!-- Word display -->
            <div style="background: #e8eaf6; border-radius: 8px; padding: 24px; margin-bottom: 20px; text-align: center;">
              @if (currentExerciseMode === 'multiple-choice') {
                <div style="font-size: 1.5em; font-weight: 500; margin-bottom: 4px;">{{ currentWord.word }}</div>
                <div style="font-size: 0.85em; color: #5c6bc0;">Pick the correct translation</div>
              }
              @else {
                <div style="font-size: 0.85em; color: #5c6bc0; margin-bottom: 4px;">{{ currentWord.translation }}</div>
                <div style="font-size: 1.3em; font-weight: 500;">
                  @if (currentExerciseMode === 'spell-word') { Spell the word in <strong>{{ currentWord.practiceLanguage | uppercase }}</strong> }
                  @else { Type the word in <strong>{{ currentWord.practiceLanguage | uppercase }}</strong> }
                </div>
              }
            </div>

            <!-- Multiple Choice -->
            @if (currentExerciseMode === 'multiple-choice') {
              <div>
                @for (choice of currentChoices; track $index) {
                  <div style="margin-bottom: 10px;">
                    <button mat-stroked-button
                      [style.background]="getChoiceBg($index)"
                      [style.color]="showResult && choice === currentWord.translation ? 'white' : ''"
                      [style.border-color]="getChoiceBorder($index)"
                      [disabled]="showResult"
                      (click)="selectChoice($index)"
                      style="width: 100%; justify-content: center; padding: 12px; height: auto; white-space: normal; font-size: 1.05em;">
                      {{ choice }}
                    </button>
                  </div>
                }
              </div>
            }

            <!-- Spell Word -->
            @if (currentExerciseMode === 'spell-word') {
              <div>
                @if (selectedLetters.length > 0) {
                  <div style="min-height: 48px; border: 2px dashed #3f51b5; border-radius: 8px; padding: 8px; margin-bottom: 12px; display: flex; flex-wrap: wrap; gap: 4px; background: #f3f5ff;">
                    @for (l of selectedLetters; track $index; let i = $index) {
                      <span (click)="removeLetter(i)" style="display: inline-flex; align-items: center; justify-content: center; width: 36px; height: 36px; background: #3f51b5; color: white; border-radius: 4px; cursor: pointer; font-weight: 500; font-size: 1.1em;">{{ l }}</span>
                    }
                  </div>
                }
                @if (selectedLetters.length === 0) {
                  <div style="min-height: 48px; border: 2px dashed #ccc; border-radius: 8px; padding: 8px; margin-bottom: 12px; display: flex; align-items: center; justify-content: center; color: #aaa;">Tap letters to spell the word</div>
                }
                <div style="display: flex; flex-wrap: wrap; gap: 6px;">
                  @for (l of availableLetters; track $index; let i = $index) {
                    <span (click)="selectLetter(l, i)" style="display: inline-flex; align-items: center; justify-content: center; width: 36px; height: 36px; background: #e8eaf6; color: #1a237e; border-radius: 4px; cursor: pointer; font-weight: 500; font-size: 1.1em; border: 1px solid #c5cae9;">{{ l }}</span>
                  }
                </div>
              </div>
            }

            <!-- Type Word -->
            @if (currentExerciseMode === 'type-word') {
              <div>
                <mat-form-field appearance="outline" style="width: 100%;">
                  <mat-label>Type the word</mat-label>
                  <input matInput [(ngModel)]="typedAnswer" (keydown.enter)="submitTypeAnswer()"
                    placeholder="Type here..." autocomplete="off" spellcheck="false"
                    [disabled]="showResult">
                </mat-form-field>
              </div>
            }

            <!-- Result -->
            @if (showResult) {
              <div style="margin-top: 16px; border-radius: 8px; padding: 16px;"
                [style.background]="isCorrect ? '#e8f5e9' : '#fbe9e7'">
                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                  <mat-icon [style.color]="isCorrect ? '#2e7d32' : '#c62828'">{{ isCorrect ? 'check_circle' : 'cancel' }}</mat-icon>
                  <strong [style.color]="isCorrect ? '#2e7d32' : '#c62828'">{{ isCorrect ? 'Correct!' : 'Incorrect' }}</strong>
                </div>
                @if (!isCorrect) {
                  <div style="font-size: 0.9em; color: #666;">
                    Correct answer: <strong>{{ currentWord.translation }}</strong>
                  </div>
                }
              </div>
            }

            <!-- Actions -->
            @if (!showResult) {
              <div style="margin-top: 16px; display: flex; gap: 8px;">
                @if (currentExerciseMode === 'multiple-choice' || currentExerciseMode === 'spell-word') {
                  <button mat-raised-button color="primary" (click)="submitMCSpellAnswer()" [disabled]="!canSubmit()">
                    <mat-icon>check</mat-icon> Check Answer
                  </button>
                }
                @if (currentExerciseMode === 'type-word') {
                  <button mat-raised-button color="primary" (click)="submitTypeAnswer()" [disabled]="!typedAnswer.trim()">
                    <mat-icon>check</mat-icon> Check Answer
                  </button>
                }
                <button mat-button (click)="resetWord()"><mat-icon>refresh</mat-icon> Reset</button>
                <button mat-button (click)="skipWord()"><mat-icon>chevron_right</mat-icon> Skip</button>
              </div>
            }
            @if (showResult) {
              <div style="margin-top: 16px; display: flex; gap: 8px;">
                <button mat-raised-button color="primary" (click)="nextWord()">
                  <mat-icon>chevron_right</mat-icon> Next Word
                </button>
                <button mat-button (click)="resetWord()"><mat-icon>replay</mat-icon> Retry</button>
              </div>
            }

            @if (currentWord.parentVerbId) {
              <div style="margin-top: 8px; font-size: 0.8em; color: #888;">
                <mat-icon style="font-size: 14px; vertical-align: middle;">link</mat-icon>
                Verb form (see verbs page for conjugation)
              </div>
            }
          </mat-card-content>
        </mat-card>
      }
    </div>

    <!-- Word List Modal -->
    @if (showWordList) {
      <div style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); z-index: 1000; display: flex; align-items: center; justify-content: center;">
        <mat-card style="width: 90%; max-width: 900px; max-height: 80vh; overflow: hidden; display: flex; flex-direction: column;">
          <mat-card-header>
            <mat-card-title style="display: flex; align-items: center; gap: 8px;">
              <mat-icon>list</mat-icon> All Words ({{ filteredWords.length }})
            </mat-card-title>
            <button mat-icon-button (click)="showWordList = false" style="margin-left: auto;">
              <mat-icon>close</mat-icon>
            </button>
          </mat-card-header>
          <mat-card-content style="overflow-y: auto; flex: 1;">
            <div style="display: flex; gap: 12px; margin-bottom: 16px; flex-wrap: wrap;">
              <mat-form-field appearance="outline" style="flex: 1; min-width: 200px;">
                <mat-label>Search</mat-label>
                <input matInput [(ngModel)]="filterText" (input)="applyFilter()" placeholder="Search word or translation...">
              </mat-form-field>
              <mat-form-field appearance="outline" style="width: 130px;">
                <mat-label>Language</mat-label>
                <mat-select [(ngModel)]="filterLanguage" (selectionChange)="applyFilter()">
                  <mat-option value="">All</mat-option>
                  <mat-option value="en">English</mat-option>
                  <mat-option value="es">Spanish</mat-option>
                  <mat-option value="fr">French</mat-option>
                </mat-select>
              </mat-form-field>
              <mat-form-field appearance="outline" style="width: 130px;">
                <mat-label>Difficulty</mat-label>
                <mat-select [(ngModel)]="filterDifficulty" (selectionChange)="applyFilter()">
                  <mat-option value="">All</mat-option>
                  <mat-option value="easy">Easy</mat-option>
                  <mat-option value="medium">Medium</mat-option>
                  <mat-option value="hard">Hard</mat-option>
                </mat-select>
              </mat-form-field>
            </div>
            @for (w of filteredWords; track w.id || $index) {
              <mat-card style="margin-bottom: 8px; cursor: pointer;" (click)="selectWord(w); showWordList = false;">
                <mat-card-content style="display: flex; justify-content: space-between; align-items: center; padding: 12px 16px;">
                  <div style="flex: 1; min-width: 0;">
                    <div style="display: flex; align-items: center; gap: 8px;">
                      @if (w.tags?.includes('favorite')) {
                        <mat-icon style="font-size: 16px; color: #f44336;">star</mat-icon>
                      }
                      <strong style="font-size: 1.05em;">{{ w.word }}</strong>
                      <mat-icon style="font-size: 16px; color: #999;">arrow_forward</mat-icon>
                      <em style="font-size: 1.05em;">{{ w.translation }}</em>
                    </div>
                    <div style="font-size: 0.75em; color: #aaa; margin-top: 4px;">
                      {{ (w.practiceLanguage || '') | uppercase }}
                      · {{ w.difficulty || 'unrated' }}
                      · {{ w.practiceCount || 0 }}× practiced
                      · {{ (w.accuracyRate || 0) | number:'1.0-0' }}%
                      @if (w.tags?.length) { <span> · {{ w.tags.join(', ') }}</span> }
                    </div>
                  </div>
                  <div style="display: flex; gap: 4px; flex-shrink: 0;">
                    <button mat-icon-button color="primary" (click)="$event.stopPropagation(); selectWord(w); showWordList = false; openEditWord(w);" title="Edit">
                      <mat-icon>edit</mat-icon>
                    </button>
                    <button mat-icon-button color="warn" (click)="$event.stopPropagation(); deleteWord(w)" title="Delete">
                      <mat-icon>delete</mat-icon>
                    </button>
                  </div>
                </mat-card-content>
              </mat-card>
            }
          </mat-card-content>
        </mat-card>
      </div>
    }

    <!-- Create Word Modal -->
    @if (showCreateModal) {
      <div style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); z-index: 1000; display: flex; align-items: center; justify-content: center;">
        <mat-card style="width: 90%; max-width: 500px;">
          <mat-card-header>
            <mat-card-title>Add Word</mat-card-title>
            <button mat-icon-button (click)="showCreateModal = false" style="margin-left: auto;">
              <mat-icon>close</mat-icon>
            </button>
          </mat-card-header>
          <mat-card-content style="padding-top: 16px;">
            <mat-form-field appearance="outline" style="width: 100%; margin-bottom: 12px;">
              <mat-label>Word</mat-label>
              <input matInput [(ngModel)]="createWordText" placeholder="Enter word...">
            </mat-form-field>
            <mat-form-field appearance="outline" style="width: 100%; margin-bottom: 12px;">
              <mat-label>Translation</mat-label>
              <input matInput [(ngModel)]="createTranslation" placeholder="Enter translation...">
            </mat-form-field>
            <mat-form-field appearance="outline" style="width: 100%; margin-bottom: 12px;">
              <mat-label>Difficulty</mat-label>
              <mat-select [(ngModel)]="createDifficulty">
                <mat-option value="">None</mat-option>
                <mat-option value="easy">Easy</mat-option>
                <mat-option value="medium">Medium</mat-option>
                <mat-option value="hard">Hard</mat-option>
              </mat-select>
            </mat-form-field>
            <div style="display: flex; gap: 8px; justify-content: flex-end;">
              <button mat-button (click)="showCreateModal = false">Cancel</button>
              <button mat-raised-button color="primary" (click)="createWord()"
                [disabled]="!createWordText.trim() || !createTranslation.trim() || isCreatingWord()">
                @if (isCreatingWord()) { <mat-spinner diameter="16" style="display: inline-block; margin-right: 4px;"></mat-spinner> }
                Create
              </button>
            </div>
          </mat-card-content>
        </mat-card>
      </div>
    }

    <!-- Edit Word Modal -->
    @if (showEditModal && editingWord) {
      <div style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); z-index: 1000; display: flex; align-items: center; justify-content: center;">
        <mat-card style="width: 90%; max-width: 500px;">
          <mat-card-header>
            <mat-card-title>Edit Word</mat-card-title>
            <button mat-icon-button (click)="showEditModal = false" style="margin-left: auto;">
              <mat-icon>close</mat-icon>
            </button>
          </mat-card-header>
          <mat-card-content style="padding-top: 16px;">
            <mat-form-field appearance="outline" style="width: 100%; margin-bottom: 12px;">
              <mat-label>Word</mat-label>
              <input matInput [(ngModel)]="editWordText" placeholder="Enter word...">
            </mat-form-field>
            <mat-form-field appearance="outline" style="width: 100%; margin-bottom: 12px;">
              <mat-label>Translation</mat-label>
              <input matInput [(ngModel)]="editTranslation" placeholder="Enter translation...">
            </mat-form-field>
            <mat-form-field appearance="outline" style="width: 100%; margin-bottom: 12px;">
              <mat-label>Difficulty</mat-label>
              <mat-select [(ngModel)]="editDifficulty">
                <mat-option value="">None</mat-option>
                <mat-option value="easy">Easy</mat-option>
                <mat-option value="medium">Medium</mat-option>
                <mat-option value="hard">Hard</mat-option>
              </mat-select>
            </mat-form-field>
            <mat-form-field appearance="outline" style="width: 100%; margin-bottom: 12px;">
              <mat-label>Tags (comma-separated)</mat-label>
              <input matInput [(ngModel)]="editTagsInput" placeholder="e.g. food, travel">
            </mat-form-field>
            <div style="display: flex; gap: 8px; justify-content: flex-end;">
              <button mat-button (click)="showEditModal = false">Cancel</button>
              <button mat-raised-button color="primary" (click)="saveEdit()"
                [disabled]="!editWordText.trim() || !editTranslation.trim()">
                Save
              </button>
            </div>
          </mat-card-content>
        </mat-card>
      </div>
    }
  `,
})
export class VocabularyPageComponent implements OnInit {
  // Data
  words: any[] = [];
  filteredWords: any[] = [];
  currentWord: any = null;

  // Practice state
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

  // Filters
  filterText = '';
  filterLanguage = '';
  filterDifficulty = '';

  // Modals
  showWordList = false;
  showCreateModal = false;
  showEditModal = false;
  editingWord: any = null;

  // Create form
  createWordText = '';
  createTranslation = '';
  createDifficulty = '';
  isCreatingWord = signal(false);

  // Edit form
  editWordText = '';
  editTranslation = '';
  editDifficulty = '';
  editTagsInput = '';

  // Signals
  loading = signal(false);
  favoriteCount = signal(0);

  private vocab = inject(VocabularyService);
  private tagService = inject(TagService);
  private settings = inject(SettingsService);
  private snackBar = inject(MatSnackBar);
  private dialog = inject(MatDialog);

  constructor() {
    // Load exercise types from settings
  }

  async ngOnInit() {
    await this.load();
  }

  async load() {
    this.loading.set(true);
    try {
      const s = this.settings.get();
      this.words = await this.vocab.getAll(s.practiceLanguage, s.nativeLanguage);
      this.favoriteCount.set(this.words.filter((w: any) => w.tags?.includes('favorite')).length);
      this.applyFilter();
      if (this.words.length > 0 && !this.currentWord) this.pickNextWord();
    } catch {
      this.snackBar.open('Failed to load vocabulary', 'OK', { duration: 3000 });
    }
    this.loading.set(false);
  }

  applyFilter() {
    let list = this.words;
    if (this.filterText) {
      const q = this.filterText.toLowerCase();
      list = list.filter(w => (w.word || '').toLowerCase().includes(q) || (w.translation || '').toLowerCase().includes(q));
    }
    if (this.filterLanguage) list = list.filter(w => (w.practiceLanguage || '') === this.filterLanguage);
    if (this.filterDifficulty) list = list.filter(w => w.difficulty === this.filterDifficulty);
    this.filteredWords = list;
  }

  sessionAccuracy() {
    return this.sessionAttempts === 0 ? 0 : Math.round((this.sessionCorrect / this.sessionAttempts) * 100);
  }

  getDifficultyColor(d: string) {
    return d === 'easy' ? '#4caf50' : d === 'medium' ? '#ff9800' : '#f44336';
  }

  getDisplayTags(w: any) {
    return (w.tags || []).filter((t: string) => !['favorite', 'review', 'ignore'].includes(t));
  }

  isFavorite(w: any) { return w?.tags?.includes('favorite') ?? false; }
  isMarkedForReview(w: any) { return w?.tags?.includes('review') ?? false; }

  getModeName() {
    if (this.currentExerciseMode === 'multiple-choice') return 'Multiple Choice';
    if (this.currentExerciseMode === 'spell-word') return 'Spell the Word';
    return 'Type the Word';
  }

  // ─── Word selection ────────────────────────────────────

  pickNextWord() {
    if (this.words.length === 0) { this.currentWord = null; return; }
    let remain = this.words.map((_, i) => i).filter(i => !this.usedIndices.includes(i));
    if (remain.length === 0) { this.usedIndices = []; remain = this.words.map((_, i) => i); }
    const idx = remain[Math.floor(Math.random() * remain.length)];
    this.currentWord = this.words[idx];
    this.usedIndices.push(idx);
    this.setupWord();
  }

  selectWord(w: any) {
    this.currentWord = w;
    const idx = this.words.indexOf(w);
    if (idx >= 0) {
      this.usedIndices = [idx];
    }
    this.setupWord();
  }

  restartSession() { this.usedIndices = []; this.sessionCorrect = 0; this.sessionAttempts = 0; this.pickNextWord(); }

  setupWord() {
    this.showResult = false;
    this.typedAnswer = '';
    if (!this.currentWord) return;

    // Pick exercise type
    const types: VocabExerciseType[] = ['multiple-choice', 'spell-word', 'type-word'];
    this.currentExerciseMode = types[Math.floor(Math.random() * types.length)];

    if (this.currentExerciseMode === 'multiple-choice') {
      this.setupMultipleChoice();
    } else if (this.currentExerciseMode === 'spell-word') {
      this.setupSpellWord();
    } else {
      this.setupTypeWord();
    }
  }

  setupMultipleChoice() {
    // Pick 3 random wrong answers
    const others = this.words.filter(w => w.id !== this.currentWord.id).map(w => w.translation);
    const shuffled = [...others].sort(() => Math.random() - 0.5).slice(0, 3);
    const choices = [...shuffled, this.currentWord.translation].sort(() => Math.random() - 0.5);
    this.currentChoices = choices;
  }

  setupSpellWord() {
    const word = this.currentWord.word;
    const letters = word.split('');
    this.availableLetters = [...letters].sort(() => Math.random() - 0.5);
    this.selectedLetters = [];
  }

  setupTypeWord() {
    this.typedAnswer = '';
  }

  // ─── Practice actions ─────────────────────────────────

  selectChoice(index: number) {
    if (this.showResult) return;
    this.sessionAttempts++;
    const correct = this.currentChoices[index] === this.currentWord.translation;
    this.isCorrect = correct;
    if (correct) this.sessionCorrect++;
    this.showResult = true;
    this.updateStats(correct, this.currentExerciseMode);
  }

  selectLetter(letter: string, index: number) {
    this.selectedLetters.push(letter);
    this.availableLetters.splice(index, 1);
  }

  removeLetter(index: number) {
    const letter = this.selectedLetters.splice(index, 1)[0];
    this.availableLetters.push(letter);
  }

  canSubmit(): boolean {
    if (this.currentExerciseMode === 'spell-word') return this.selectedLetters.length > 0 && this.availableLetters.length === 0;
    return false;
  }

  submitMCSpellAnswer() {
    if (this.currentExerciseMode === 'spell-word') {
      this.sessionAttempts++;
      const userWord = this.selectedLetters.join('').toLowerCase().trim();
      const correctWord = this.currentWord.word.toLowerCase().trim();
      this.isCorrect = userWord === correctWord;
      if (this.isCorrect) this.sessionCorrect++;
      this.showResult = true;
      this.updateStats(this.isCorrect, 'spell-word');
    }
  }

  submitTypeAnswer() {
    if (!this.typedAnswer.trim()) return;
    this.sessionAttempts++;
    const userWord = this.typedAnswer.trim().toLowerCase();
    const correctWord = this.currentWord.word.toLowerCase().trim();
    this.isCorrect = userWord === correctWord;
    if (this.isCorrect) this.sessionCorrect++;
    this.showResult = true;
    this.updateStats(this.isCorrect, 'type-word');
  }

  getChoiceBg(index: number): string {
    if (!this.showResult) return '';
    if (this.currentChoices[index] === this.currentWord.translation) return '#4caf50';
    return '';
  }

  getChoiceBorder(index: number): string {
    if (!this.showResult) return '';
    if (this.currentChoices[index] === this.currentWord.translation) return '#388e3c';
    return '';
  }

  async updateStats(correct: boolean, exerciseType: string) {
    if (!this.currentWord?.id) return;
    try {
      await this.vocab.updateStats(this.currentWord.id, correct, exerciseType);
      // Update local state
      const idx = this.words.findIndex(w => w.id === this.currentWord.id);
      if (idx >= 0) {
        this.words[idx] = {
          ...this.words[idx],
          practiceCount: (this.words[idx].practiceCount || 0) + 1,
          correctCount: (this.words[idx].correctCount || 0) + (correct ? 1 : 0),
        };
      }
    } catch {}
  }

  resetWord() { this.setupWord(); }
  skipWord() { this.pickNextWord(); }
  nextWord() { this.pickNextWord(); }

  // ─── Tags ─────────────────────────────────────────────

  async toggleFavorite() {
    if (!this.currentWord?.id) return;
    const tags = [...(this.currentWord.tags || [])];
    const idx = tags.indexOf('favorite');
    if (idx >= 0) tags.splice(idx, 1); else tags.push('favorite');
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
    const idx = tags.indexOf('review');
    if (idx >= 0) tags.splice(idx, 1); else tags.push('review');
    try {
      await this.vocab.update(this.currentWord.id, { ...this.currentWord, tags });
      this.currentWord.tags = tags;
      const i = this.words.findIndex(w => w.id === this.currentWord.id);
      if (i >= 0) this.words[i] = { ...this.words[i], tags };
    } catch {}
  }

  // ─── CRUD ─────────────────────────────────────────────

  openWordList() {
    this.applyFilter();
    this.showWordList = true;
  }

  openCreateWord() {
    this.createWordText = '';
    this.createTranslation = '';
    this.createDifficulty = '';
    this.showCreateModal = true;
  }

  openEditWord(w: any) {
    this.editingWord = w;
    this.editWordText = w.word || '';
    this.editTranslation = w.translation || '';
    this.editDifficulty = w.difficulty || '';
    this.editTagsInput = (w.tags || []).filter((t: string) => !['favorite', 'review', 'ignore'].includes(t)).join(', ');
    this.showEditModal = true;
  }

  async createWord() {
    const wordText = this.createWordText.trim();
    const translation = this.createTranslation.trim();
    if (!wordText || !translation) return;
    this.isCreatingWord.set(true);
    try {
      const s = this.settings.get();
      await this.vocab.create({
        word: wordText,
        translation,
        practiceLanguage: s.practiceLanguage,
        nativeLanguage: s.nativeLanguage,
        difficulty: this.createDifficulty || undefined,
        tags: [],
      });
      this.showCreateModal = false;
      await this.load();
      this.snackBar.open('Word created', 'OK', { duration: 2000 });
    } catch {
      this.snackBar.open('Failed to create word', 'OK', { duration: 3000 });
    }
    this.isCreatingWord.set(false);
  }

  async saveEdit() {
    if (!this.editingWord?.id) return;
    try {
      const userTags = this.editTagsInput.split(',').map(t => t.trim()).filter(t => t);
      const systemTags = (this.editingWord.tags || []).filter((t: string) => ['favorite', 'review', 'ignore'].includes(t));
      const tags = [...new Set([...systemTags, ...userTags])];
      await this.vocab.update(this.editingWord.id, {
        ...this.editingWord,
        word: this.editWordText.trim(),
        translation: this.editTranslation.trim(),
        difficulty: this.editDifficulty || undefined,
        tags,
      });
      this.showEditModal = false;
      await this.load();
      this.snackBar.open('Word updated', 'OK', { duration: 2000 });
    } catch {
      this.snackBar.open('Failed to update word', 'OK', { duration: 3000 });
    }
  }

  async deleteWord(w: any) {
    if (!confirm(`Delete "${w.word}"?`)) return;
    try {
      await this.vocab.delete(w.id);
      await this.load();
      this.snackBar.open('Deleted', 'OK', { duration: 2000 });
      if (this.currentWord?.id === w.id) this.pickNextWord();
    } catch {
      this.snackBar.open('Failed to delete', 'OK', { duration: 3000 });
    }
  }
}