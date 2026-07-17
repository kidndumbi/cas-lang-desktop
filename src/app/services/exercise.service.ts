import { Injectable } from '@angular/core';
import { TauriIpcService } from './tau-ipc.service';

@Injectable({ providedIn: 'root' })
export class ExerciseService {
  constructor(private ipc: TauriIpcService) {}

  getAll(practiceLanguage?: string, nativeLanguage?: string) {
    console.log('[ExerciseService] calling get_exercises', { practiceLanguage, nativeLanguage });
    return this.ipc.invoke<any[]>('get_exercises', {
      practiceLanguage: practiceLanguage || null,
      nativeLanguage: nativeLanguage || null,
    }).then(data => {
      console.log('[ExerciseService] get_exercises result:', data);
      return data;
    }).catch(err => {
      console.error('[ExerciseService] get_exercises error:', err);
      throw err;
    });
  }

  create(exercise: any) {
    return this.ipc.invoke<any>('create_exercise', { exercise });
  }

  update(id: string, exercise: any) {
    return this.ipc.invoke<any>('update_exercise', { id, exercise });
  }

  updateStats(id: string, correct: boolean, snapshot?: any) {
    return this.ipc.invoke<void>('update_exercise_stats', { id, correct, snapshot: snapshot || null });
  }

  delete(id: string) {
    return this.ipc.invoke<void>('delete_exercise', { id });
  }
}