import { inject, Injectable } from '@angular/core';
import { LlmService } from './llm.service';

@Injectable({ providedIn: 'root' })
export class TranslationService {
  private llm = inject(LlmService);

  async translateText(
    text: string,
    sourceLanguage: string,
    targetLanguage: string,
  ): Promise<string> {
    const langNames: Record<string, string> = { en: 'English', es: 'Spanish', fr: 'French' };
    const prompt = `Translate the following text from ${langNames[sourceLanguage] ?? sourceLanguage} to ${langNames[targetLanguage] ?? targetLanguage}. Reply ONLY with the translation, nothing else:\n\n${text}`;

    try {
      return await this.llm.generateWithDeepseek(prompt) ?? '';
    } catch (err) {
      throw err;
    }
  }
}