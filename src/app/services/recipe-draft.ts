import { Injectable, signal } from '@angular/core';

export interface Ingredient {
  name: string;
  quantity: number;
  unit: string;
}

@Injectable({ providedIn: 'root' })
export class RecipeDraft {
  readonly ingredients = signal<Ingredient[]>([]);
  readonly portions = signal(2);
  readonly cooks = signal(1);
  readonly cookingTime = signal('');
  readonly cuisine = signal('');
  readonly diet = signal('No preferences');
}
