import { Component, Inject, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { LlmService } from '../../services/llm.service';

export interface VocabularyAiChatModalData {
  word: any;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  isLoading?: boolean;
}

@Component({
  selector: 'app-vocabulary-ai-chat-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, MatCardModule, MatButtonModule, MatIconModule, MatFormFieldModule, MatInputModule, MatProgressSpinnerModule, MatDialogModule],
  template: `
    <h2 mat-dialog-title style="display: flex; align-items: center; gap: 8px; justify-content: space-between;">
      <span><mat-icon>smart_toy</mat-icon> AI Chat</span>
      @if (messages().length > 0) {
        <button mat-icon-button (click)="clearChat()" title="Clear chat">
          <mat-icon>delete</mat-icon>
        </button>
      }
    </h2>
    <mat-dialog-content style="min-height: 300px; max-height: 50vh; overflow-y: auto;">
      @for (msg of messages(); track $index) {
        <div style="margin-bottom: 12px; display: flex; flex-direction: column;"
          [style.align-items]="msg.role === 'user' ? 'flex-end' : 'flex-start'">
          <div [style.background]="msg.role === 'user' ? '#3f51b5' : '#f5f5f5'"
            [style.color]="msg.role === 'user' ? 'white' : '#333'"
            style="padding: 10px 14px; border-radius: 16px; max-width: 85%; white-space: pre-wrap; word-break: break-word;">
            @if (msg.isLoading) {
              <div style="display: flex; align-items: center; gap: 8px;">
                <mat-spinner diameter="20"></mat-spinner>
                Thinking...
              </div>
            }
            @else {
              {{ msg.content }}
            }
          </div>
        </div>
      }
    </mat-dialog-content>
    <mat-dialog-actions>
      <div style="display: flex; width: 100%; gap: 8px;">
        <mat-form-field appearance="outline" style="flex: 1;">
          <input matInput [(ngModel)]="userInputText" placeholder="Ask about this word..."
            (keydown.enter)="sendMessage()" [disabled]="isStreaming()">
        </mat-form-field>
        <button mat-raised-button color="primary" (click)="sendMessage()"
          [disabled]="!userInputText.trim() || isStreaming()">
          <mat-icon>send</mat-icon>
        </button>
      </div>
    </mat-dialog-actions>
  `,
})
export class VocabularyAiChatModalComponent {
  llmService = inject(LlmService);
  messages = signal<ChatMessage[]>([]);
  userInputText = '';
  isStreaming = signal(false);

  constructor(
    public dialogRef: MatDialogRef<VocabularyAiChatModalComponent>,
    @Inject(MAT_DIALOG_DATA) public data: VocabularyAiChatModalData,
  ) {}

  sendMessage(): void {
    const text = this.userInputText.trim();
    if (!text || this.isStreaming()) return;
    this.userInputText = '';
    const msgs = [...this.messages(), { role: 'user' as const, content: text }];
    this.messages.set(msgs);

    const loadingMsg: ChatMessage = { role: 'assistant', content: '', isLoading: true };
    this.messages.set([...msgs, loadingMsg]);
    this.isStreaming.set(true);

    const w = this.data.word;
    const context = w ? `\nContext: We are discussing the word "${w.word}" (${w.translation}) in ${w.practiceLanguage}.` : '';
    const prompt = msgs.map(m => `${m.role}: ${m.content}`).join('\n') + `\nassistant: ${context}`;

    let accumulated = '';
    this.llmService.generateWithDeepseekStream(prompt, (chunk: string) => {
      accumulated += chunk;
      this.messages.update(m => {
        const copy = [...m];
        const last = copy[copy.length - 1];
        if (last?.isLoading) copy[copy.length - 1] = { role: 'assistant', content: accumulated };
        return copy;
      });
    }).then((final: string) => {
      this.messages.update(m => {
        const copy = [...m];
        copy[copy.length - 1] = { role: 'assistant', content: final };
        return copy;
      });
      this.isStreaming.set(false);
    }).catch(() => {
      this.messages.update(m => m.filter(x => !x.isLoading));
      this.messages.update(m => [...m, { role: 'assistant', content: 'Sorry, something went wrong.' }]);
      this.isStreaming.set(false);
    });
  }

  clearChat(): void { this.messages.set([]); }
}