import { Routes } from '@angular/router';
import { LanguageLearningPageComponent } from './language-learning/components/language-learning-page.component';
import { VocabularyPageComponent } from './vocabulary/vocabulary-page.component';
import { AiVocabularyPageComponent } from './ai-vocabulary/ai-vocabulary-page.component';
import { VerbsPageComponent } from './verbs/verbs-page.component';
import { OverviewPageComponent } from './overview/overview-page.component';
import { HistoryPageComponent } from './history/history-page.component';
import { SettingsComponent } from './settings/settings.component';

export const routes: Routes = [
  { path: '', redirectTo: 'language-learning', pathMatch: 'full' },
  { path: 'language-learning', component: LanguageLearningPageComponent },
  { path: 'vocabulary', component: VocabularyPageComponent },
  { path: 'ai-vocabulary', component: AiVocabularyPageComponent },
  { path: 'verbs', component: VerbsPageComponent },
  { path: 'overview', component: OverviewPageComponent },
  { path: 'history', component: HistoryPageComponent },
  { path: 'settings', component: SettingsComponent },
];