import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

type VocabExerciseType = 'multiple-choice' | 'spell-word' | 'type-word';

@Component({
  selector: 'app-vocabulary-word-card',
  standalone: true,
  imports: [CommonModule, FormsModule, MatCardModule, MatButtonModule, MatIconModule, MatFormFieldModule, MatInputModule],
  template: `
    <mat-card style="margin-bottom: 16px;">
      <mat-card-content style="padding: 24px;">
        <!-- Header -->
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px;">
          <div style="display: flex; flex-wrap: wrap; gap: 8px; align-items: center;">
            <span style="background: #3f51b5; color: white; padding: 2px 10px; border-radius: 12px; font-size: 0.8em;">
              {{ (word().practiceLanguage || word()['practice_language'] || '') | uppercase }}
            </span>
            @if (word().difficulty) {
              <span [style.background]="getDifficultyColor(word().difficulty)" style="color: white; padding: 2px 10px; border-radius: 12px; font-size: 0.8em;">
                {{ word().difficulty }}
              </span>
            }
            @for (tag of displayTags(); track tag) {
              <span style="background: #e3f2fd; padding: 2px 8px; border-radius: 10px; font-size: 0.75em; color: #1565c0;">{{ tag }}</span>
            }
          </div>
          <div style="display: flex; gap: 2px;">
            <button mat-icon-button [color]="isFavorite() ? 'warn' : ''" (click)="toggleFavorite.emit()" title="Favorite">
              <mat-icon>{{ isFavorite() ? 'star' : 'star_border' }}</mat-icon>
            </button>
            <button mat-icon-button [color]="isMarkedForReview() ? 'primary' : ''" (click)="toggleReview.emit()" title="Mark for review">
              <mat-icon>{{ isMarkedForReview() ? 'bookmark' : 'bookmark_border' }}</mat-icon>
            </button>
            <button mat-icon-button color="primary" (click)="editWord.emit(word())" title="Edit">
              <mat-icon>edit</mat-icon>
            </button>
          </div>
        </div>

        <div style="font-size: 0.8em; color: #666; margin-bottom: 16px;">
          Mode: {{ modeName() }} · {{ word().practiceCount || word()['practice_count'] || 0 }}× practiced
          · {{ (word().accuracyRate || word()['accuracy_rate'] || 0) | number:'1.0-0' }}%
        </div>

        <!-- Word display -->
        <div style="background: #e8eaf6; border-radius: 8px; padding: 24px; margin-bottom: 20px; text-align: center;">
          @if (exerciseMode() === 'multiple-choice') {
            <div style="font-size: 1.5em; font-weight: 500; margin-bottom: 4px;">{{ word().word }}</div>
            <div style="font-size: 0.85em; color: #5c6bc0;">Pick the correct translation</div>
          }
          @else {
            <div style="font-size: 0.85em; color: #5c6bc0; margin-bottom: 4px;">{{ word().translation }}</div>
            <div style="font-size: 1.3em; font-weight: 500;">
              @if (exerciseMode() === 'spell-word') { Spell the word in <strong>{{ (word().practiceLanguage || word()['practice_language'] || '') | uppercase }}</strong> }
              @else { Type the word in <strong>{{ (word().practiceLanguage || word()['practice_language'] || '') | uppercase }}</strong> }
            </div>
          }
        </div>

        <!-- Multiple Choice -->
        @if (exerciseMode() === 'multiple-choice') {
          <div>
            @for (choice of choices(); track $index) {
              <div style="margin-bottom: 10px;">
                <button mat-stroked-button
                  [style.background]="getChoiceBg($index)"
                  [style.color]="showResult() && choice === word().translation ? 'white' : ''"
                  [style.border-color]="getChoiceBorder($index)"
                  [disabled]="showResult()"
                  (click)="selectChoice.emit($index)"
                  style="width: 100%; justify-content: center; padding: 12px; height: auto; white-space: normal; font-size: 1.05em;">
                  {{ choice }}
                </button>
              </div>
            }
          </div>
        }

        <!-- Spell Word -->
        @if (exerciseMode() === 'spell-word') {
          <div>
            @if (selectedLetters().length > 0) {
              <div style="min-height: 48px; border: 2px dashed #3f51b5; border-radius: 8px; padding: 8px; margin-bottom: 12px; display: flex; flex-wrap: wrap; gap: 4px; background: #f3f5ff;">
                @for (l of selectedLetters(); track $index; let i = $index) {
                  <span (click)="removeLetter.emit(i)" style="display: inline-flex; align-items: center; justify-content: center; width: 36px; height: 36px; background: #3f51b5; color: white; border-radius: 4px; cursor: pointer; font-weight: 500; font-size: 1.1em;">{{ l }}</span>
                }
              </div>
            }
            @if (selectedLetters().length === 0) {
              <div style="min-height: 48px; border: 2px dashed #ccc; border-radius: 8px; padding: 8px; margin-bottom: 12px; display: flex; align-items: center; justify-content: center; color: #aaa;">Tap letters to spell the word</div>
            }
            <div style="display: flex; flex-wrap: wrap; gap: 6px;">
              @for (l of availableLetters(); track $index; let i = $index) {
                <span (click)="selectLetter.emit({letter: l, index: i})" style="display: inline-flex; align-items: center; justify-content: center; width: 36px; height: 36px; background: #e8eaf6; color: #1a237e; border-radius: 4px; cursor: pointer; font-weight: 500; font-size: 1.1em; border: 1px solid #c5cae9;">{{ l }}</span>
              }
            </div>
          </div>
        }

        <!-- Type Word -->
        @if (exerciseMode() === 'type-word') {
          <div>
            <mat-form-field appearance="outline" style="width: 100%;">
              <mat-label>Type the word</mat-label>
              <input matInput [ngModel]="typedAnswer()" (ngModelChange)="typedAnswerChange.emit($event)"
                (keydown.enter)="submitType.emit()"
                placeholder="Type here..." autocomplete="off" spellcheck="false"
                [disabled]="showResult()">
            </mat-form-field>
          </div>
        }

        <!-- Result -->
        @if (showResult()) {
          <div style="margin-top: 16px; border-radius: 8px; padding: 16px;"
            [style.background]="isCorrect() ? '#e8f5e9' : '#fbe9e7'">
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
              <mat-icon [style.color]="isCorrect() ? '#2e7d32' : '#c62828'">{{ isCorrect() ? 'check_circle' : 'cancel' }}</mat-icon>
              <strong [style.color]="isCorrect() ? '#2e7d32' : '#c62828'">{{ isCorrect() ? 'Correct!' : 'Incorrect' }}</strong>
            </div>
            @if (!isCorrect()) {
              <div style="font-size: 0.9em; color: #666;">
                Correct answer: <strong>{{ word().translation }}</strong>
              </div>
            }
          </div>
        }

        <!-- Actions -->
        @if (!showResult()) {
          <div style="margin-top: 16px; display: flex; gap: 8px;">
            @if (exerciseMode() === 'multiple-choice' || exerciseMode() === 'spell-word') {
              <button mat-raised-button color="primary" (click)="submitMCSpell.emit()" [disabled]="!canSubmit()">
                <mat-icon>check</mat-icon> Check Answer
              </button>
            }
            @if (exerciseMode() === 'type-word') {
              <button mat-raised-button color="primary" (click)="submitType.emit()" [disabled]="!(typedAnswer() || '').trim()">
                <mat-icon>check</mat-icon> Check Answer
              </button>
            }
            <button mat-button (click)="reset.emit()"><mat-icon>refresh</mat-icon> Reset</button>
            <button mat-button (click)="skip.emit()"><mat-icon>chevron_right</mat-icon> Skip</button>
          </div>
        }
        @if (showResult()) {
          <div style="margin-top: 16px; display: flex; gap: 8px;">
            <button mat-raised-button color="primary" (click)="next.emit()">
              <mat-icon>chevron_right</mat-icon> Next Word
            </button>
            <button mat-button (click)="reset.emit()"><mat-icon>replay</mat-icon> Retry</button>
          </div>
        }
      </mat-card-content>
    </mat-card>
  `,
})
export class VocabularyWordCardComponent {
  word = input<any>(null);
  exerciseMode = input<VocabExerciseType>('multiple-choice');
  choices = input<string[]>([]);
  availableLetters = input<string[]>([]);
  selectedLetters = input<string[]>([]);
  typedAnswer = input<string>('');
  showResult = input<boolean>(false);
  isCorrect = input<boolean>(false);
  isFavorite = input<boolean>(false);
  isMarkedForReview = input<boolean>(false);
  canSubmit = input<boolean>(false);
  displayTags = input<string[]>([]);

  typedAnswerChange = output<string>();
  selectChoice = output<number>();
  selectLetter = output<{ letter: string; index: number }>();
  removeLetter = output<number>();
  submitMCSpell = output<void>();
  submitType = output<void>();
  reset = output<void>();
  skip = output<void>();
  next = output<void>();
  toggleFavorite = output<void>();
  toggleReview = output<void>();
  editWord = output<any>();

  modeName(): string {
    if (this.exerciseMode() === 'multiple-choice') return 'Multiple Choice';
    if (this.exerciseMode() === 'spell-word') return 'Spell the Word';
    return 'Type the Word';
  }

  getDifficultyColor(d: string): string {
    return d === 'easy' ? '#4caf50' : d === 'medium' ? '#ff9800' : '#f44336';
  }

  getChoiceBg(index: number): string {
    if (!this.showResult()) return '';
    const w = this.word();
    if (!w) return '';
    if (this.choices()[index] === w.translation) return '#4caf50';
    return '';
  }

  getChoiceBorder(index: number): string {
    if (!this.showResult()) return '';
    const w = this.word();
    if (!w) return '';
    if (this.choices()[index] === w.translation) return '#388e3c';
    return '';
  }
}