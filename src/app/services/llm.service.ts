import { Injectable, signal } from '@angular/core';
import OpenAI from 'openai';

const DEEPSEEK_API_KEY_PREF = 'deepseek-api-key';

@Injectable({ providedIn: 'root' })
export class LlmService {
  deepseekApiKey = signal<string>('');
  isTestingDeepseekKey = signal<boolean>(false);
  deepseekKeyTestResult = signal<'idle' | 'success' | 'error'>('idle');
  deepseekKeyTestMessage = signal<string>('');

  constructor() {
    const stored = localStorage.getItem(DEEPSEEK_API_KEY_PREF);
    if (stored) {
      this.deepseekApiKey.set(stored);
    }
  }

  setDeepseekApiKey(key: string): void {
    this.deepseekApiKey.set(key);
    localStorage.setItem(DEEPSEEK_API_KEY_PREF, key);
    this.deepseekKeyTestResult.set('idle');
    this.deepseekKeyTestMessage.set('');
  }

  async testDeepseekApiKey(): Promise<void> {
    const apiKey = this.deepseekApiKey();
    if (!apiKey.trim()) {
      this.deepseekKeyTestResult.set('error');
      this.deepseekKeyTestMessage.set('API key is empty.');
      return;
    }
    this.isTestingDeepseekKey.set(true);
    this.deepseekKeyTestResult.set('idle');
    this.deepseekKeyTestMessage.set('');
    try {
      const client = new OpenAI({
        apiKey,
        baseURL: 'https://api.deepseek.com',
        dangerouslyAllowBrowser: true,
      });
      // Non-streaming responses can hang indefinitely on DeepSeek's reasoning models; stream instead.
      const stream: any = await client.chat.completions.create({
        model: 'deepseek-v4-pro',
        messages: [{ role: 'user', content: 'Hi' }],
        max_tokens: 5,
        stream: true,
        // deepseek-flash defaults to "thinking" mode, which can hang on trivial prompts; force it off.
        thinking: { type: 'disabled' },
      } as any);
      for await (const _chunk of stream) {
        // draining the stream confirms the key/connection works; content itself is irrelevant for this test
      }
      this.deepseekKeyTestResult.set('success');
      this.deepseekKeyTestMessage.set('API key is valid and working.');
    } catch (err: unknown) {
      this.deepseekKeyTestResult.set('error');
      const msg = err instanceof Error ? err.message : 'Network error';
      this.deepseekKeyTestMessage.set(`Failed: ${msg}`);
    } finally {
      this.isTestingDeepseekKey.set(false);
    }
  }

  async generateWithDeepseek(prompt: string): Promise<string> {
    // DeepSeek reasoning models can hang on non-streaming responses; read via stream and collect the full text.
    let full = '';
    await this.generateWithDeepseekStream(prompt, (chunk) => { full += chunk; });
    return full;
  }

  /** Stream a response from DeepSeek, calling onChunk for each text fragment and onDone when complete */
  async generateWithDeepseekStream(
    prompt: string,
    onChunk: (text: string) => void,
    signal?: AbortSignal,
  ): Promise<string> {
    const apiKey = this.deepseekApiKey();
    if (!apiKey) {
      throw new Error('No DeepSeek API key configured. Please add your API key in Settings.');
    }
    const client = new OpenAI({
      apiKey,
      baseURL: 'https://api.deepseek.com',
      dangerouslyAllowBrowser: true,
    });
    const stream: any = await client.chat.completions.create({
      model: 'deepseek-v4-pro',
      messages: [{ role: 'user', content: prompt }],
      stream: true,
      // deepseek-flash defaults to "thinking" mode, which can hang/stall on simple prompts; force it off.
      thinking: { type: 'disabled' },
    } as any, { signal });

    let full = '';
    for await (const chunk of stream) {
      const text = chunk.choices[0]?.delta?.content ?? '';
      if (text) {
        full += text;
        onChunk(text);
      }
    }
    return full;
  }
}