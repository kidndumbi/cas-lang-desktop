import { Injectable } from '@angular/core';
import { TauriIpcService } from './tau-ipc.service';

@Injectable({ providedIn: 'root' })
export class VocabularyService {
  constructor(private ipc: TauriIpcService) {}

  getAll(practiceLanguage?: string, nativeLanguage?: string) {
    return this.ipc.invoke<any[]>('get_vocabulary', {
      practiceLanguage: practiceLanguage || null,
      nativeLanguage: nativeLanguage || null,
    });
  }

  create(word: any) {
    return this.ipc.invoke<any>('create_vocabulary', { word });
  }

  update(id: string, word: any) {
    return this.ipc.invoke<any>('update_vocabulary', { id, word });
  }

  updateStats(id: string, correct: boolean, exerciseType: string) {
    return this.ipc.invoke<void>('update_vocabulary_stats', {
      id,
      correct,
      exerciseType,
    });
  }

  delete(id: string) {
    return this.ipc.invoke<void>('delete_vocabulary', { id });
  }

  getLogs(wordId: string) {
    return this.ipc.invoke<any>('get_vocabulary_logs', { wordId });
  }
}
