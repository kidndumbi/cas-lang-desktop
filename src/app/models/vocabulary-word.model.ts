export interface VocabularyWord {
  id?: string;
  word: string;
  translation: string;
  practiceLanguage: 'en' | 'es' | 'fr';
  nativeLanguage: 'en' | 'es' | 'fr';
  difficulty?: 'easy' | 'medium' | 'hard';
  tags?: string[];
  practiceCount?: number;
  correctCount?: number;
  accuracyRate?: number;
  mcTotal?: number;
  mcCorrect?: number;
  swTotal?: number;
  swCorrect?: number;
  twTotal?: number;
  twCorrect?: number;
  parentVerbId?: string;
  tensesId?: string;
  notes?: string;
  createdAt: number;
  lastPracticed?: number;
}

export type CreateVocabularyWord = Omit<VocabularyWord, 'id' | 'createdAt' | 'practiceCount' | 'correctCount' | 'accuracyRate' | 'mcTotal' | 'mcCorrect' | 'swTotal' | 'swCorrect' | 'twTotal' | 'twCorrect' | 'lastPracticed'>;

export type UpdateVocabularyWord = Partial<Pick<VocabularyWord, 'word' | 'translation' | 'practiceLanguage' | 'nativeLanguage' | 'difficulty' | 'tags' | 'parentVerbId' | 'tensesId' | 'notes'>>;