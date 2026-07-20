import { Injectable, signal } from '@angular/core';

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

  private readonly BASE_URL = 'http://localhost:11434';

  /** Fetch available models from Ollama */
  async fetchModels(): Promise<OllamaModel[]> {
    this.isLoadingModels.set(true);
    this.loadError.set('');
    try {
      const resp = await fetch(`${this.BASE_URL}/api/tags`);
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const data = await resp.json();
      const models = data.models || [];
      this.models.set(models);
      return models;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Connection failed';
      this.loadError.set(`Ollama not reachable: ${msg}`);
      this.models.set([]);
      return [];
    } finally {
      this.isLoadingModels.set(false);
    }
  }

  /** Generate text via Ollama */
  async generate(prompt: string, model: string): Promise<string> {
    const resp = await fetch(`${this.BASE_URL}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        prompt,
        stream: false,
      }),
    });
    if (!resp.ok) throw new Error(`Ollama HTTP ${resp.status}`);
    const data = await resp.json();
    return data.response?.trim() ?? '';
  }

  /** Quick check if Ollama server is reachable */
  async ping(): Promise<boolean> {
    try {
      const resp = await fetch(`${this.BASE_URL}/api/tags`, { signal: AbortSignal.timeout(3000) });
      return resp.ok;
    } catch {
      return false;
    }
  }
}