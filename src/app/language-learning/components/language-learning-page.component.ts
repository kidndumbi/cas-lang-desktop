import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { ExerciseService } from '../../services/exercise.service';
import { TagService } from '../../services/tag.service';
import { SettingsService } from '../../services/settings.service';
import { ExerciseStatsHeaderComponent } from './exercise-stats-header.component';
import { TagManagementModalComponent, TagManagementModalData } from './tag-management-modal.component';
import { ExerciseListModalComponent, ExerciseListModalData } from './exercise-list-modal.component';
import { CreateExerciseModalComponent, CreateExerciseModalData } from './create-exercise-modal.component';

type PracticeMode = 'arrange-words' | 'fill-in-missing' | 'spell-the-blanks';

@Component({
  selector: 'app-language-learning-page',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    MatCardModule, MatButtonModule, MatIconModule, MatChipsModule, MatSnackBarModule, MatDialogModule,
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
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px;">
              <div>
                <mat-chip-set role="list">
                  <mat-chip-row role="listitem">{{ settings.practiceLanguage | uppercase }} → {{ settings.nativeLanguage | uppercase }}</mat-chip-row>
                </mat-chip-set>
                <div style="margin-top: 8px; font-size: 0.85em; color: #666;">
                  Mode: {{ getModeName() }} · {{ (exercise.wordCount || exercise['word_count'] || 0) }} words
                </div>
              </div>
              @if (availablePracticeTypes.length > 1) {
                <button mat-icon-button color="primary" (click)="toggleMode()" title="Switch mode">
                  <mat-icon>swap_horiz</mat-icon>
                </button>
              }
            </div>

            <div style="background: #e8eaf6; border-radius: 8px; padding: 16px; margin-bottom: 20px;">
              <div style="font-size: 0.8em; color: #5c6bc0; margin-bottom: 4px;">Reference ({{ settings.nativeLanguage | uppercase }})</div>
              <div style="font-size: 1.1em; font-weight: 500;">{{ exercise.nativeLanguageText || exercise['native_language_text'] }}</div>
            </div>

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
                <div style="font-size: 0.8em; color: #888; margin-bottom: 8px;">Fill in the missing words:</div>
                <div style="font-size: 1.15em; line-height: 2.2;">
                  @for (part of fillTemplate; track $index; let i = $index) {
                    @if (part.isBlank) {
                      <input type="text" [value]="blankAnswers[i] || ''" (input)="onBlankChange($event, i)" placeholder="?"
                        style="width: 80px; padding: 4px 8px; border: 2px solid #3f51b5; border-radius: 4px; text-align: center; font-size: 1em; margin: 0 4px;" autocomplete="off" spellcheck="false">
                    }
                    @if (!part.isBlank) {
                      <span>{{ part.text }}</span>
                    }
                  }
                </div>
              </div>
            }

            @if (currentMode === 'spell-the-blanks') {
              <div>
                <div style="font-size: 0.8em; color: #888; margin-bottom: 8px;">Type the missing words from memory:</div>
                <div style="font-size: 1.15em; line-height: 2.2;">
                  @for (part of spellTemplate; track $index; let i = $index) {
                    @if (part.isBlank) {
                      <input type="text" [value]="spellAnswers[i] || ''" (input)="onSpellChange($event, i)" placeholder="?"
                        style="width: 80px; padding: 4px 8px; border: 2px solid #e91e63; border-radius: 4px; text-align: center; font-size: 1em; margin: 0 4px;" autocomplete="off" spellcheck="false">
                    }
                    @if (!part.isBlank) {
                      <span>{{ part.text }}</span>
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
                @if (!isCorrect) {
                  <div style="font-size: 0.9em; color: #666;">
                    Correct answer: <strong>{{ exercise.practiceLanguageText || exercise['practice_language_text'] }}</strong>
                  </div>
                }
              </div>
            }

            @if (!showResult) {
              <div style="margin-top: 16px; display: flex; gap: 8px;">
                <button mat-raised-button color="primary" (click)="submitAnswer()" [disabled]="!canSubmit()">
                  <mat-icon>check</mat-icon> Check Answer
                </button>
                <button mat-button (click)="resetExercise()"><mat-icon>refresh</mat-icon> Reset</button>
              </div>
            }
            @if (showResult) {
              <div style="margin-top: 16px; display: flex; gap: 8px;">
                <button mat-raised-button color="primary" (click)="nextExercise()"><mat-icon>chevron_right</mat-icon> Next Exercise</button>
                <button mat-button (click)="resetExercise()"><mat-icon>replay</mat-icon> Retry</button>
              </div>
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
  fillTemplate: { text: string; isBlank: boolean }[] = [];
  blankAnswers: string[] = [];
  spellTemplate: { text: string; isBlank: boolean }[] = [];
  spellAnswers: string[] = [];
  showResult = false;
  isCorrect = false;
  sessionCorrect = 0;
  sessionAttempts = 0;
  private usedIndices: number[] = [];

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
  private filters: any = { searchText: '', practiceLanguage: 'all', difficulty: 'all' };
  private pageSize = 20;

  constructor(
    private exerciseService: ExerciseService,
    private tagService: TagService,
    private ss: SettingsService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog,
  ) {}

  async ngOnInit() {
    this.settings = this.ss.get();
    this.availablePracticeTypes = this.settings.practiceTypes.filter((t: string) => t !== 'conversation') as PracticeMode[];
    if (this.availablePracticeTypes.length === 0) this.availablePracticeTypes = ['arrange-words'];
    this.currentMode = this.availablePracticeTypes[0] as PracticeMode;
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
    const text = this.exercise.practiceLanguageText || this.exercise['practice_language_text'] || '';
    const words = text.split(/\s+/).filter((w: string) => w.length > 0);
    if (this.currentMode === 'arrange-words') {
      this.selectedWords = [];
      this.availableWords = this.shuffle([...words]);
    } else if (this.currentMode === 'fill-in-missing') {
      this.fillTemplate = []; this.blankAnswers = [];
      const parts = text.split(/(\s+)/); let bi = 0;
      for (const p of parts) {
        const t = p.trim();
        if (t.length === 0) this.fillTemplate.push({ text: p, isBlank: false });
        else if (bi % 2 === 0) this.fillTemplate.push({ text: p, isBlank: false });
        else { this.fillTemplate.push({ text: '', isBlank: true }); this.blankAnswers.push(''); }
        if (t.length > 0) bi++;
      }
    } else {
      this.spellTemplate = []; this.spellAnswers = [];
      const parts = text.split(/(\s+)/); let bi = 0;
      for (const p of parts) {
        const t = p.trim();
        if (t.length === 0) this.spellTemplate.push({ text: p, isBlank: false });
        else if (bi % 2 === 0) this.spellTemplate.push({ text: p, isBlank: false });
        else { this.spellTemplate.push({ text: '', isBlank: true }); this.spellAnswers.push(''); }
        if (t.length > 0) bi++;
      }
    }
  }

  selectWord(w: string, i: number) { this.selectedWords.push(w); this.availableWords.splice(i, 1); }
  removeWord(i: number) { const w = this.selectedWords.splice(i, 1)[0]; this.availableWords.push(w); }
  onBlankChange(e: Event, i: number) { this.blankAnswers[i] = (e.target as HTMLInputElement).value; }
  onSpellChange(e: Event, i: number) { this.spellAnswers[i] = (e.target as HTMLInputElement).value; }

  canSubmit(): boolean {
    if (this.currentMode === 'arrange-words') return this.selectedWords.length > 0 && this.availableWords.length === 0;
    if (this.currentMode === 'fill-in-missing') return this.blankAnswers.every(a => a.trim().length > 0);
    return this.spellAnswers.every(a => a.trim().length > 0);
  }

  async submitAnswer() {
    this.showResult = true; this.sessionAttempts++;
    const answer = (this.exercise.practiceLanguageText || this.exercise['practice_language_text'] || '').toLowerCase().trim();
    let user = '';
    if (this.currentMode === 'arrange-words') {
      user = this.selectedWords.join(' ').toLowerCase().trim();
    } else if (this.currentMode === 'fill-in-missing') {
      let bi = 0;
      for (const p of this.fillTemplate) {
        if (p.isBlank) { user += (user.length > 0 ? ' ' : '') + this.blankAnswers[bi]; bi++; }
        else user += (user.length > 0 ? ' ' : '') + p.text.trim();
      }
    } else {
      let bi = 0;
      for (const p of this.spellTemplate) {
        if (p.isBlank) { user += (user.length > 0 ? ' ' : '') + this.spellAnswers[bi]; bi++; }
        else user += (user.length > 0 ? ' ' : '') + p.text.trim();
      }
    }
    this.isCorrect = user.toLowerCase().trim() === answer;
    if (this.isCorrect) this.sessionCorrect++;
    try { await this.exerciseService.updateStats(this.exercise.id || this.exercise['id'], this.isCorrect); } catch {}
  }

  resetExercise() { this.setupExercise(); }
  nextExercise() { this.pickRandomExercise(); }
  restartSession() { this.usedIndices = []; this.sessionCorrect = 0; this.sessionAttempts = 0; this.pickRandomExercise(); }

  toggleMode() {
    const idx = this.availablePracticeTypes.indexOf(this.currentMode);
    this.currentMode = this.availablePracticeTypes[(idx + 1) % this.availablePracticeTypes.length] as PracticeMode;
    this.setupExercise();
  }

  getModeName() {
    if (this.currentMode === 'arrange-words') return 'Arrange Words';
    if (this.currentMode === 'fill-in-missing') return 'Fill in Missing';
    return 'Spell the Blanks';
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

  async editExercise(ex: any) {
    this.snackBar.open('Edit exercise coming soon', 'OK', { duration: 2000 });
  }

  updateFilter(key: string, value: string) {
    this.filters[key] = value;
    this.applyPagination();
  }

  clearFilters() {
    this.filters = { searchText: '', practiceLanguage: 'all', difficulty: 'all' };
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
    if (this.filters.practiceLanguage !== 'all') {
      list = list.filter((e: any) => e.practiceLanguage === this.filters.practiceLanguage);
    }
    if (this.filters.difficulty !== 'all') {
      list = list.filter((e: any) => e.difficulty === this.filters.difficulty);
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