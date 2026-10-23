import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/home/home').then((component) => component.Home),
  },
  {
    path: 'generate-recipe',
    loadComponent: () =>
      import('./pages/generate-recipe/generate-recipe').then(
        (component) => component.GenerateRecipe,
      ),
  },
  {
    path: 'generate-recipe/preferences',
    loadComponent: () =>
      import('./pages/preferences/preferences').then((component) => component.Preferences),
  },
  {
    path: 'cookbook',
    loadComponent: () =>
      import('./pages/cookbook/cookbook').then((component) => component.Cookbook),
  },
  {
    path: 'results',
    loadComponent: () => import('./pages/results/results').then((component) => component.Results),
  },
  {
    path: 'recipe/:id',
    loadComponent: () =>
      import('./pages/recipe-detail/recipe-detail').then((component) => component.RecipeDetail),
  },
  {
    path: '**',
    redirectTo: '',
  },
];
