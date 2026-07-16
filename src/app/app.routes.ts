import { Routes } from '@angular/router';
import { SettingsComponent } from './settings/settings.component';
import { ExerciseListComponent } from './language-learning/components/exercise-list.component';
import { VocabularyListComponent } from './language-learning/components/vocabulary-list.component';

export const routes: Routes = [
  { path: '', redirectTo: 'exercises', pathMatch: 'full' },
  { path: 'exercises', component: ExerciseListComponent },
  { path: 'vocabulary', component: VocabularyListComponent },
  { path: 'settings', component: SettingsComponent },
];