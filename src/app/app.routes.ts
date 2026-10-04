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
    path: '**',
    redirectTo: '',
  },
];
