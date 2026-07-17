import { Injectable } from '@angular/core';
import { TauriIpcService } from './tau-ipc.service';

@Injectable({ providedIn: 'root' })
export class TagService {
  constructor(private ipc: TauriIpcService) {}

  getAll() {
    return this.ipc.invoke<string[]>('get_tags');
  }

  add(tag: string) {
    return this.ipc.invoke<void>('add_tag', { tag });
  }

  delete(tag: string) {
    return this.ipc.invoke<void>('delete_tag', { tag });
  }
}