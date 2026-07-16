export interface LanguageLearningExercise {
  id?: string;
  videoFilePath: string;
  videoFileName?: string;
  practiceLanguageText: string;
  nativeLanguageText: string;
  practiceLanguage: 'en' | 'es' | 'fr';
  nativeLanguage: 'en' | 'es' | 'fr';
  difficulty?: 'easy' | 'medium' | 'hard';
  wordCount: number;
  startTime: number;
  endTime: number;
  createdAt: string | number;
  practiceCount?: number;
  correctCount?: number;
  accuracyRate?: number;
  tags?: string[];
}

export type CreateExercise = Omit<LanguageLearningExercise, 'id' | 'createdAt' | 'practiceCount' | 'correctCount' | 'accuracyRate'>;

export interface ExerciseStatsUpdate {
  correct: boolean;
  snapshot?: {
    userAnswer: string;
    correctAnswer: string;
    nativeText: string;
    practiceMode?: string;
    options?: string[];
  };
}