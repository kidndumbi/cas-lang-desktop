import { Injectable } from '@angular/core';
import { TauriIpcService } from './tau-ipc.service';

@Injectable({ providedIn: 'root' })
export class ExerciseService {
  constructor(private ipc: TauriIpcService) {}

  getAll(practiceLanguage?: string, nativeLanguage?: string) {
    return this.ipc.invoke<any[]>('get_exercises', {
      practiceLanguage: practiceLanguage || null,
      nativeLanguage: nativeLanguage || null,
    });
  }

  create(exercise: any) {
    return this.ipc.invoke<any>('create_exercise', { exercise });
  }

  delete(id: string) {
    return this.ipc.invoke<void>('delete_exercise', { id });
  }
}