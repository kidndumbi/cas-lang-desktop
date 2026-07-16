import { Routes } from '@angular/router';
import { SettingsComponent } from './settings/settings.component';
import { PracticeComponent } from './language-learning/components/practice.component';
import { VocabularyListComponent } from './language-learning/components/vocabulary-list.component';

export const routes: Routes = [
  { path: '', redirectTo: 'practice', pathMatch: 'full' },
  { path: 'practice', component: PracticeComponent },
  { path: 'vocabulary', component: VocabularyListComponent },
  { path: 'settings', component: SettingsComponent },
];