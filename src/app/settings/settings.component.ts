import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { CommonModule } from '@angular/common';
import { SettingsService, AppSettings } from '../services/settings.service';
import { LlmService } from '../services/llm.service';
import { ExerciseService } from '../services/exercise.service';
import { VocabularyService } from '../services/vocabulary.service';
import { OllamaService } from '../services/ollama.service';

type Language = 'en' | 'es' | 'fr';
type Length = 'low' | 'medium' | 'high';
type BulkGenerationType = 'exercise' | 'vocabulary';

const LANG_NAMES: Record<Language, string> = {
  en: 'English',
  es: 'Spanish',
  fr: 'French',
};

const LENGTH_INSTRUCTIONS: Record<Length, string> = {
  low: 'It should be short and simple — around 4 to 6 words.',
  medium: 'It should be conversational and moderately complex — around 7 to 9 words.',
  high: 'It should be detailed and complex — around 10 to 12 words.',
};

interface BulkProgress {
  current: number;
  total: number;
  saved: number;
  skipped: number;
  errors: number;
}

const VOCAB_CATEGORIES = [
  'everyday verbs (actions)', 'food and drink', 'animals and nature',
  'household objects', 'emotions and personality', 'transportation and travel',
  'body parts and health', 'clothing and fashion', 'work and professions',
  'time expressions and calendar', 'technology and devices', 'weather and seasons',
  'family and relationships', 'sports and hobbies', 'education and school',
  'adjectives (size, color, quality)', 'numbers and quantities', 'places and geography',
];

const VOCAB_STOP_WORDS = new Set([
  'the','a','an','is','are','was','were','be','been','being','have','has','had','do',
  'does','did','will','would','could','should','may','might','shall','can','must',
  'to','of','in','on','at','by','for','with','about','and','or','but','if','so',
  'yet','it','its','this','that','these','those','he','she','we','they','you','i',
  'me','him','her','us','them','my','your','his','our','their','not','no','as','up',
  'out','than','then','when','what','how','who','which','there','from','into','also',
  'just','only','more','very','too','all','each','any',
  'el','la','los','las','un','una','unos','unas','es','son','era','fue','ser','estar',
  'y','o','pero','si','en','de','a','con','por','para','que','su','sus','mi','tu',
  'se','me','te','le','lo','no','yo','al','del','hay','he','ha','han','ya','muy',
  'más','como','cuando','donde','este','esta','estos','estas','ese','esa',
  'le','les','du','au','aux','je','tu','il','elle','nous','vous','ils','elles','et',
  'ou','mais','si','que','ce','se','me','ne','pas','en','sur','dans','par','son',
  'ma','mon','ses','leur','très','plus','aussi','est','sont','été','une','des','qui',
  'lui','leur','quand','comme','avec','cette','cet','ces',
]);

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, MatCardModule, MatFormFieldModule, MatSelectModule, MatButtonModule, MatCheckboxModule, MatInputModule, MatIconModule, MatProgressSpinnerModule, MatProgressBarModule],
  template: `
    <div style="padding: 24px; max-width: 700px; margin: 0 auto; display: flex; flex-direction: column; gap: 16px;">
      <!-- Languages -->
      <mat-card>
        <mat-card-header><mat-card-title>Languages</mat-card-title></mat-card-header>
        <mat-card-content>
          <form [formGroup]="langForm" (ngSubmit)="saveLang()" style="display: flex; gap: 16px; flex-wrap: wrap; align-items: center;">
            <mat-form-field appearance="outline" style="flex: 1; min-width: 180px;">
              <mat-label>Native Language</mat-label>
              <mat-select formControlName="nativeLanguage">
                <mat-option value="en">English</mat-option>
                <mat-option value="es">Spanish</mat-option>
                <mat-option value="fr">French</mat-option>
              </mat-select>
            </mat-form-field>
            <mat-form-field appearance="outline" style="flex: 1; min-width: 180px;">
              <mat-label>Practice Language</mat-label>
              <mat-select formControlName="practiceLanguage">
                <mat-option value="en">English</mat-option>
                <mat-option value="es">Spanish</mat-option>
                <mat-option value="fr">French</mat-option>
              </mat-select>
            </mat-form-field>
            <button mat-raised-button color="primary" type="submit">Save</button>
          </form>
        </mat-card-content>
      </mat-card>

      <!-- DeepSeek API Key -->
      <mat-card>
        <mat-card-header><mat-card-title>DeepSeek API Key</mat-card-title></mat-card-header>
        <mat-card-content>
          <p style="font-size: 0.85em; color: #888; margin-bottom: 12px;">
            Required when using DeepSeek as the generation model or translation engine. Get a key at <a href="https://platform.deepseek.com/api_keys" target="_blank">platform.deepseek.com</a>.
          </p>
          <div style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap;">
            <mat-form-field appearance="outline" style="flex: 1; min-width: 250px;">
              <mat-label>API Key</mat-label>
              <input matInput [value]="llmService.deepseekApiKey()" (input)="onApiKeyChange($event)" placeholder="sk-..." type="password" [disabled]="llmService.isTestingDeepseekKey()">
              <mat-icon matSuffix>key</mat-icon>
            </mat-form-field>
            <button mat-raised-button color="primary" (click)="saveAndTestApiKey()" [disabled]="llmService.isTestingDeepseekKey()">
              @if (llmService.isTestingDeepseekKey()) {
                <mat-spinner diameter="20" style="display: inline-block; margin-right: 8px;"></mat-spinner>
              }
              Save & Test
            </button>
          </div>
          @if (llmService.deepseekKeyTestResult() !== 'idle') {
            <div style="margin-top: 8px; padding: 8px 12px; border-radius: 4px;"
              [style.background]="llmService.deepseekKeyTestResult() === 'success' ? '#e8f5e9' : '#fbe9e7'">
              <span [style.color]="llmService.deepseekKeyTestResult() === 'success' ? '#2e7d32' : '#c62828'" style="font-size: 0.85em;">
                @if (llmService.deepseekKeyTestResult() === 'success') {
                  <mat-icon style="font-size: 16px; vertical-align: middle;">check_circle</mat-icon>
                }
                @else {
                  <mat-icon style="font-size: 16px; vertical-align: middle;">error</mat-icon>
                }
                {{ llmService.deepseekKeyTestMessage() }}
              </span>
            </div>
          }
        </mat-card-content>
      </mat-card>

      <!-- Language Learning Exercise Types -->
      <mat-card>
        <mat-card-header><mat-card-title>Language Learning Exercise Types</mat-card-title></mat-card-header>
        <mat-card-content>
          <p style="font-size: 0.85em; color: #888; margin-bottom: 12px;">Check one or more types. When multiple are checked, a random type is picked each exercise.</p>
          @for (pt of practiceTypeDefs; track pt.id) {
            <div style="margin-bottom: 12px;">
              <mat-checkbox [checked]="isPracticeTypeEnabled(pt.id)" (change)="togglePracticeType(pt.id, $event.checked)">
                <strong>{{ pt.label }}</strong>
                <br><small style="color: #888;">{{ pt.desc }}</small>
              </mat-checkbox>
            </div>
          }
        </mat-card-content>
      </mat-card>

      <!-- Vocabulary Exercise Types -->
      <mat-card>
        <mat-card-header><mat-card-title>Vocabulary Exercise Types</mat-card-title></mat-card-header>
        <mat-card-content>
          <p style="font-size: 0.85em; color: #888; margin-bottom: 12px;">Check one or more types. When multiple are checked, a random type is picked for each vocabulary word.</p>
          @for (vt of vocabTypeDefs; track vt.id) {
            <div style="margin-bottom: 12px;">
              <mat-checkbox [checked]="isVocabTypeEnabled(vt.id)" (change)="toggleVocabType(vt.id, $event.checked)">
                <strong>{{ vt.label }}</strong>
                <br><small style="color: #888;">{{ vt.desc }}</small>
              </mat-checkbox>
            </div>
          }
        </mat-card-content>
      </mat-card>

      <!-- Bulk Generation -->
      <mat-card>
        <mat-card-header><mat-card-title>Bulk Generation</mat-card-title></mat-card-header>
        <mat-card-content>
          <p style="font-size: 0.85em; color: #888; margin-bottom: 12px;">
            Uses AI to generate exercises or vocabulary words. Exercises are saved with "auto-generated" and a translation engine tag.
          </p>

          <div style="display: flex; flex-direction: column; gap: 12px;">

            <!-- Generate Type -->
            <mat-form-field appearance="outline" style="width: 100%;">
              <mat-label>Generate</mat-label>
              <mat-select [(ngModel)]="bulkGenerationType" [disabled]="isBulkGenerating">
                <mat-option value="exercise">Exercises</mat-option>
                <mat-option value="vocabulary">Vocabulary Words</mat-option>
              </mat-select>
            </mat-form-field>

            <!-- Language Selection -->
            <div style="display: flex; gap: 12px; flex-wrap: wrap;">
              <mat-form-field appearance="outline" style="flex: 1; min-width: 180px;">
                <mat-label>Native Language</mat-label>
                <mat-select [(ngModel)]="bulkNativeLanguage" [disabled]="isBulkGenerating">
                  <mat-option value="en">English</mat-option>
                  <mat-option value="es">Spanish</mat-option>
                  <mat-option value="fr">French</mat-option>
                </mat-select>
              </mat-form-field>
              <mat-form-field appearance="outline" style="flex: 1; min-width: 180px;">
                <mat-label>Practice Language</mat-label>
                <mat-select [(ngModel)]="bulkPracticeLanguage" [disabled]="isBulkGenerating">
                  <mat-option value="en">English</mat-option>
                  <mat-option value="es">Spanish</mat-option>
                  <mat-option value="fr">French</mat-option>
                </mat-select>
              </mat-form-field>
            </div>

            <!-- Exercise-specific options -->
            @if (bulkGenerationType === 'exercise') {
              <!-- Sentence Length -->
              <mat-form-field appearance="outline" style="width: 100%;">
                <mat-label>Sentence Length</mat-label>
                <mat-select [(ngModel)]="bulkLength" [disabled]="isBulkGenerating">
                  <mat-option value="low">Short (4–6 words)</mat-option>
                  <mat-option value="medium">Medium (7–9 words)</mat-option>
                  <mat-option value="high">Long (10–12 words)</mat-option>
                </mat-select>
              </mat-form-field>

              <!-- Translation Engine -->
              <mat-form-field appearance="outline" style="width: 100%;">
                <mat-label>Translation Engine</mat-label>
                <mat-select [(ngModel)]="bulkTranslationEngine" [disabled]="isBulkGenerating">
                  <mat-option value="deepseek">DeepSeek (API)</mat-option>
                  @for (m of ollamaService.models(); track m.name) {
                    <mat-option [value]="m.name">{{ m.name }} (Ollama)</mat-option>
                  }
                </mat-select>
              </mat-form-field>
            }

            <!-- Count -->
            <mat-form-field appearance="outline" style="width: 100%;">
              <mat-label>Number to Generate (1–10,000)</mat-label>
              <input matInput type="number" [(ngModel)]="bulkCount" [disabled]="isBulkGenerating" min="1" max="10000">
            </mat-form-field>

            <!-- Generation Model (shared) -->
            <mat-form-field appearance="outline" style="width: 100%;">
              <mat-label>Generation Model</mat-label>
              <mat-select [(ngModel)]="bulkGenerationModel" [disabled]="isBulkGenerating">
                <mat-option value="deepseek">DeepSeek (API)</mat-option>
                @for (m of ollamaService.models(); track m.name) {
                  <mat-option [value]="m.name">{{ m.name }} (Ollama)</mat-option>
                }
                @if (ollamaService.models().length === 0) {
                  <mat-option value="" disabled>No Ollama models found — ensure Ollama is running</mat-option>
                }
              </mat-select>
              @if (ollamaService.loadError()) {
                <mat-hint style="color: #f44336;">{{ ollamaService.loadError() }}</mat-hint>
              }
            </mat-form-field>

            <!-- Progress -->
            @if (bulkProgress) {
              <div>
                <div style="font-size: 0.85em; margin-bottom: 4px;">
                  {{ isBulkGenerating ? 'Generating ' + bulkProgress.current + ' / ' + bulkProgress.total + '...' : 'Done: ' + bulkProgress.current + ' / ' + bulkProgress.total }}
                </div>
                <mat-progress-bar
                  mode="determinate"
                  [value]="bulkProgress.total > 0 ? (bulkProgress.current / bulkProgress.total) * 100 : 0"
                  style="margin-bottom: 8px;">
                </mat-progress-bar>
                <div style="font-size: 0.8em; color: #888;">
                  {{ bulkProgress.saved }} saved · {{ bulkProgress.skipped }} duplicates skipped · {{ bulkProgress.errors }} errors
                </div>
              </div>
            }

            <!-- Buttons -->
            @if (!isBulkGenerating) {
              <button mat-raised-button color="primary" (click)="startBulkGeneration()"
                [disabled]="bulkGenerationModel === 'deepseek' && !llmService.deepseekApiKey()">
                <mat-icon>play_arrow</mat-icon> Generate
              </button>
            }
            @if (isBulkGenerating) {
              <button mat-raised-button color="warn" (click)="stopBulkGeneration()">
                <mat-icon>stop</mat-icon> Stop
              </button>
            }
            @if (bulkGenerationModel === 'deepseek' && !llmService.deepseekApiKey()) {
              <div style="font-size: 0.8em; color: #f44336;">Requires a DeepSeek API key to be configured in Settings.</div>
            }

          </div>
        </mat-card-content>
      </mat-card>
    </div>
  `,
})
export class SettingsComponent implements OnInit {
  langForm: FormGroup;
  llmService = inject(LlmService);
  ollamaService = inject(OllamaService);
  private exerciseService = inject(ExerciseService);
  private vocabularyService = inject(VocabularyService);
  private ss = inject(SettingsService);

  // Bulk generation state
  bulkGenerationType: BulkGenerationType = 'exercise';
  bulkNativeLanguage: Language = 'en';
  bulkPracticeLanguage: Language = 'es';
  bulkLength: Length = 'medium';
  bulkCount = 10;
  bulkGenerationModel = 'deepseek';
  bulkTranslationEngine = 'deepseek';
  isBulkGenerating = false;
  bulkProgress: BulkProgress | null = null;
  private shouldStopBulk = false;

  practiceTypeDefs = [
    { id: 'arrange-words', label: 'Arrange Words', desc: 'Unscramble all words into the correct order.' },
    { id: 'fill-in-missing', label: 'Fill in Missing Words', desc: 'Half the sentence is shown; type the missing words.' },
    { id: 'spell-the-blanks', label: 'Spell the Blanks', desc: 'Half the sentence is shown; type the missing words from memory.' },
    { id: 'conversation', label: 'Dialogue Practice', desc: 'AI generates a two-line dialogue; pick the correct response from 4 options. Requires AI.' },
  ];

  vocabTypeDefs = [
    { id: 'multiple-choice', label: 'Multiple Choice', desc: 'See the word, pick the correct meaning from four options.' },
    { id: 'spell-word', label: 'Spell the Word', desc: 'See the definition, spell the vocabulary word by selecting scrambled letters.' },
    { id: 'type-word', label: 'Type the Word', desc: 'See the definition, type the vocabulary word from memory.' },
  ];

  private apiKeyDraft = '';

  constructor(private fb: FormBuilder) {
    const settings = this.ss.get();
    this.langForm = this.fb.group({
      nativeLanguage: [settings.nativeLanguage],
      practiceLanguage: [settings.practiceLanguage],
    });
    this.bulkNativeLanguage = settings.nativeLanguage;
    this.bulkPracticeLanguage = settings.practiceLanguage;
  }

  ngOnInit() {
    this.ollamaService.fetchModels();
  }

  onApiKeyChange(event: Event): void {
    this.apiKeyDraft = (event.target as HTMLInputElement).value;
  }

  async saveAndTestApiKey(): Promise<void> {
    const key = this.apiKeyDraft.trim();
    this.llmService.setDeepseekApiKey(key);
    if (key) {
      await this.llmService.testDeepseekApiKey();
    }
  }

  saveLang() {
    if (this.langForm.valid) {
      this.ss.update(this.langForm.value as Partial<AppSettings>);
      alert('Languages saved!');
    }
  }

  isPracticeTypeEnabled(id: string) { return this.ss.practiceTypes().includes(id); }
  isVocabTypeEnabled(id: string) { return this.ss.vocabularyExerciseTypes().includes(id); }

  togglePracticeType(id: string, enabled: boolean) { this.ss.togglePracticeType(id, enabled); }
  toggleVocabType(id: string, enabled: boolean) { this.ss.toggleVocabularyExerciseType(id, enabled); }

  // ─── Bulk Generation ─────────────────────────────────────────

  startBulkGeneration(): void {
    if (this.bulkGenerationModel === 'deepseek' && !this.llmService.deepseekApiKey().trim()) {
      alert('DeepSeek API key is not configured. Please save your API key first.');
      return;
    }
    if (this.bulkGenerationType === 'exercise' && this.bulkTranslationEngine === 'deepseek' && !this.llmService.deepseekApiKey().trim()) {
      alert('DeepSeek API key is not configured. Please save your API key first.');
      return;
    }
    if (this.bulkGenerationModel !== 'deepseek' && !this.bulkGenerationModel) {
      alert('Please select a generation model or ensure Ollama is running with models installed.');
      return;
    }
    if (this.bulkNativeLanguage === this.bulkPracticeLanguage) {
      alert('Native and practice languages must be different.');
      return;
    }
    if (this.bulkCount < 1 || this.bulkCount > 10000) {
      alert('Please enter a number between 1 and 10,000.');
      return;
    }

    this.shouldStopBulk = false;
    this.isBulkGenerating = true;
    this.bulkProgress = { current: 0, total: this.bulkCount, saved: 0, skipped: 0, errors: 0 };

    if (this.bulkGenerationType === 'vocabulary') {
      this.runVocabularyGeneration();
    } else {
      this.runExerciseGeneration();
    }
  }

  stopBulkGeneration(): void {
    this.shouldStopBulk = true;
  }

  // ─── LLM helpers ──────────────────────────────────────────────

  private async generateText(prompt: string): Promise<string> {
    if (this.bulkGenerationModel === 'deepseek') {
      return this.llmService.generateWithDeepseek(prompt);
    }
    return this.ollamaService.generate(prompt, this.bulkGenerationModel);
  }

  private async translatePhrase(text: string, source: Language, target: Language): Promise<string> {
    const sourceName = LANG_NAMES[source];
    const targetName = LANG_NAMES[target];
    const prompt =
      `Translate the following ${sourceName} sentence into ${targetName}. ` +
      `Return only the translated sentence — no explanation, no quotes, no extra text.\n\n"${text}"`;

    if (this.bulkTranslationEngine === 'deepseek') {
      return this.llmService.generateWithDeepseek(prompt);
    }
    return this.ollamaService.generate(prompt, this.bulkTranslationEngine);
  }

  // ─── Exercise Generation ─────────────────────────────────────

  private async runExerciseGeneration(): Promise<void> {
    const nativeLang = this.bulkNativeLanguage;
    const practiceLang = this.bulkPracticeLanguage;
    const langName = LANG_NAMES[nativeLang];
    const lengthInstruction = LENGTH_INSTRUCTIONS[this.bulkLength];

    const translationTag =
      this.bulkTranslationEngine === 'deepseek'
        ? 'translated-by-deepseek'
        : `translated-by-${this.bulkTranslationEngine}`;

    const existingTexts = new Set<string>();
    try {
      const exercises = await this.exerciseService.getAll();
      for (const ex of exercises) {
        const pt = ex.practiceLanguageText || ex['practice_language_text'];
        if (pt) existingTexts.add(pt.trim().toLowerCase());
      }
    } catch { /* proceed */ }

    for (let i = 0; i < this.bulkCount; i++) {
      if (this.shouldStopBulk) break;

      try {
        const genPrompt =
          `Generate a single, natural ${langName} sentence suitable for a language learning exercise. ` +
          `${lengthInstruction} ` +
          `Return only the sentence itself — no explanation, no quotes, no extra text.`;
        const nativeText = await this.generateText(genPrompt);
        if (!nativeText || this.shouldStopBulk) {
          this.bulkProgress!.errors++;
          this.bulkProgress!.current++;
          continue;
        }

        const practiceText = await this.translatePhrase(nativeText, nativeLang, practiceLang);
        if (!practiceText) {
          this.bulkProgress!.errors++;
          this.bulkProgress!.current++;
          continue;
        }

        if (existingTexts.has(practiceText.trim().toLowerCase())) {
          this.bulkProgress!.skipped++;
          this.bulkProgress!.current++;
          continue;
        }

        const wordCount = practiceText.trim().split(/\s+/).filter((w: string) => w.length > 0).length;
        const exercise = {
          nativeLanguageText: nativeText.trim(),
          practiceLanguageText: practiceText.trim(),
          nativeLanguage: nativeLang,
          practiceLanguage: practiceLang,
          wordCount,
          videoFileName: 'Bulk Generation',
          videoFilePath: 'bulk-generation',
          startTime: 0,
          endTime: 1,
          duration: 1,
          tags: ['auto-generated', translationTag],
        };

        try {
          await this.exerciseService.create(exercise);
          existingTexts.add(practiceText.trim().toLowerCase());
          this.bulkProgress!.saved++;
        } catch {
          this.bulkProgress!.errors++;
        }
      } catch {
        this.bulkProgress!.errors++;
      }

      this.bulkProgress!.current++;
    }

    this.isBulkGenerating = false;
  }

  // ─── Vocabulary Word Generation ──────────────────────────────

  private async runVocabularyGeneration(): Promise<void> {
    const count = this.bulkCount;
    const nativeLang = this.bulkNativeLanguage;
    const practiceLang = this.bulkPracticeLanguage;
    const practiceLangName = LANG_NAMES[practiceLang];
    const nativeLangName = LANG_NAMES[nativeLang];

    // Load existing words for dedup
    const existingWords: string[] = [];
    try {
      const vocab = await this.vocabularyService.getAll(practiceLang, nativeLang);
      for (const w of vocab) {
        const word = w.word || w['word'];
        if (word) existingWords.push(word);
      }
    } catch { /* proceed */ }

    // Extract candidate words from existing exercises
    let exerciseCandidates: string[] = [];
    try {
      const exercises = await this.exerciseService.getAll(undefined, undefined);
      exerciseCandidates = this.extractCandidateWords(exercises, practiceLang, existingWords);
    } catch { /* proceed */ }

    const BATCH_SIZE = 5;
    const MAX_CONSECUTIVE_ERRORS = 5;
    let consecutiveErrors = 0;
    let candidateIndex = 0;

    const saveBatch = async (batch: Array<{ word: string; translation: string }>) => {
      for (const { word, translation } of batch) {
        if (this.bulkProgress!.saved >= count || this.shouldStopBulk) break;

        const alreadyExists = existingWords.some((w) => w.toLowerCase() === word.toLowerCase());
        if (alreadyExists) {
          existingWords.push(word);
          this.bulkProgress!.skipped++;
          continue;
        }

        try {
          await this.vocabularyService.create({
            word,
            translation,
            practiceLanguage: practiceLang,
            nativeLanguage: nativeLang,
            tags: ['auto-generated'],
          });
          existingWords.push(word);
          this.bulkProgress!.saved++;
          this.bulkProgress!.current = this.bulkProgress!.saved;
        } catch {
          this.bulkProgress!.errors++;
        }
      }
    };

    try {
      // Phase 1: Extract from existing exercises
      while (this.bulkProgress!.saved < count && !this.shouldStopBulk && consecutiveErrors < MAX_CONSECUTIVE_ERRORS && candidateIndex < exerciseCandidates.length) {
        const batchWords = exerciseCandidates.slice(candidateIndex, candidateIndex + BATCH_SIZE);
        candidateIndex += BATCH_SIZE;
        let batch: Array<{ word: string; translation: string }> = [];
        try {
          batch = await this.translateWordBatch(batchWords, practiceLangName, nativeLangName);
        } catch {
          consecutiveErrors++;
          this.bulkProgress!.errors++;
          continue;
        }
        if (batch.length === 0) { consecutiveErrors++; continue; }
        consecutiveErrors = 0;
        await saveBatch(batch);
      }

      // Phase 2: Generate by category via LLM
      consecutiveErrors = 0;
      let categoryIndex = Math.floor(Math.random() * VOCAB_CATEGORIES.length);
      while (this.bulkProgress!.saved < count && !this.shouldStopBulk && consecutiveErrors < MAX_CONSECUTIVE_ERRORS) {
        const batchSize = Math.min(BATCH_SIZE, count - this.bulkProgress!.saved);
        const category = VOCAB_CATEGORIES[categoryIndex % VOCAB_CATEGORIES.length];
        categoryIndex++;
        const avoidWords = existingWords.slice(-30);

        let batch: Array<{ word: string; translation: string }> = [];
        try {
          batch = await this.generateWordBatch(practiceLangName, nativeLangName, avoidWords, batchSize, category);
        } catch {
          consecutiveErrors++;
          this.bulkProgress!.errors++;
          continue;
        }
        if (batch.length === 0) { consecutiveErrors++; continue; }
        consecutiveErrors = 0;
        await saveBatch(batch);
      }
    } finally {
      this.isBulkGenerating = false;
    }
  }

  private extractCandidateWords(
    exercises: any[],
    practiceLang: string,
    existingWords: string[],
  ): string[] {
    const existingLower = new Set(existingWords.map((w: string) => w.toLowerCase()));
    const seen = new Set<string>();
    const result: string[] = [];
    for (const ex of exercises) {
      const pl = ex.practiceLanguage || ex['practice_language'];
      if (pl !== practiceLang) continue;
      const text = ex.practiceLanguageText || ex['practice_language_text'] || '';
      const tokens = text.split(/[\s,;:.!?¿¡"'(){}\[\]\/\\]+/);
      for (const token of tokens) {
        const word = token.toLowerCase().replace(/[^a-záéíóúüñàâçèêëîïôùûüœæ'-]/g, '');
        if (word.length < 3 || VOCAB_STOP_WORDS.has(word) || existingLower.has(word) || seen.has(word) || /^\d+$/.test(word) || /^['-]+$/.test(word)) continue;
        seen.add(word);
        result.push(word);
      }
    }
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }

  private parseWordTranslationJson(text: string, label: string): Array<{ word: string; translation: string }> {
    const jsonMatch = text.trim().match(/\[\s*\{[\s\S]*\}\s*\]/);
    if (!jsonMatch) throw new Error(`No JSON array in ${label} response`);
    const parsed: unknown = JSON.parse(jsonMatch[0]);
    if (!Array.isArray(parsed)) throw new Error(`${label} response is not an array`);
    return (parsed as Array<{ word?: unknown; translation?: unknown }>)
      .filter((r): r is { word: string; translation: string } => typeof r.word === 'string' && r.word.trim().length > 0 && typeof r.translation === 'string' && r.translation.trim().length > 0)
      .map((r) => ({ word: r.word.trim(), translation: r.translation.trim() }));
  }

  private async translateWordBatch(words: string[], practiceLangName: string, nativeLangName: string): Promise<Array<{ word: string; translation: string }>> {
    const prompt =
      `Translate these ${practiceLangName} words to ${nativeLangName}. ` +
      `Words: ${words.map((w) => `"${w}"`).join(', ')}. ` +
      `Return ONLY a JSON array (one entry per word): ` +
      `[{"word":"<original ${practiceLangName} word>","translation":"<${nativeLangName} meaning>"},...]. ` +
      `No markdown, no code blocks. Raw JSON only.`;

    const text = await this.generateText(prompt);
    return this.parseWordTranslationJson(text, 'LLM translation');
  }

  private async generateWordBatch(
    practiceLangName: string,
    nativeLangName: string,
    avoidWords: string[],
    batchSize: number,
    category: string,
  ): Promise<Array<{ word: string; translation: string }>> {
    const avoidClause = avoidWords.length > 0 ? `Do NOT use any of these words: ${avoidWords.join(', ')}. ` : '';
    const prompt =
      `Generate exactly ${batchSize} unique ${practiceLangName} vocabulary words in the category "${category}" with their ${nativeLangName} translations. ` +
      avoidClause +
      `Return ONLY a JSON array: [{"word":"<${practiceLangName} word>","translation":"<${nativeLangName} meaning>"},...]. ` +
      `No markdown, no code blocks, no explanations. Raw JSON only.`;

    const text = await this.generateText(prompt);
    return this.parseWordTranslationJson(text, 'LLM batch');
  }
}