import { Injectable, signal } from '@angular/core';
import { invoke } from '@tauri-apps/api/core';

export interface OllamaModel {
  name: string;
  model: string;
  modified_at: string;
  size: number;
}

@Injectable({ providedIn: 'root' })
export class OllamaService {
  models = signal<OllamaModel[]>([]);
  isLoadingModels = signal(false);
  loadError = signal('');

  /** Fetch available models from Ollama via Tauri backend */
  async fetchModels(): Promise<OllamaModel[]> {
    this.isLoadingModels.set(true);
    this.loadError.set('');
    try {
      const models = await invoke<OllamaModel[]>('fetch_ollama_models');
      this.models.set(models);
      return models;
    } catch (err) {
      const msg = typeof err === 'string' ? err : (err instanceof Error ? err.message : 'Connection failed');
      this.loadError.set(`Ollama not reachable: ${msg}`);
      this.models.set([]);
      return [];
    } finally {
      this.isLoadingModels.set(false);
    }
  }

  /** Generate text via Ollama via Tauri backend */
  async generate(prompt: string, model: string): Promise<string> {
    const text = await invoke<string>('generate_ollama', { prompt, model });
    return text;
  }

  /** Quick check if Ollama server is reachable via Tauri backend */
  async ping(): Promise<boolean> {
    try {
      return await invoke<boolean>('ping_ollama');
    } catch {
      return false;
    }
  }
}