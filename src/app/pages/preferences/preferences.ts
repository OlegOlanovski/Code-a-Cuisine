import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { RecipeDraft } from '../../services/recipe-draft';

@Component({
  selector: 'app-preferences',
  imports: [RouterLink],
  templateUrl: './preferences.html',
  styleUrl: './preferences.scss',
})
export class Preferences {
  private readonly recipeDraft = inject(RecipeDraft);

  protected readonly portions = this.recipeDraft.portions;
  protected readonly cooks = this.recipeDraft.cooks;
  protected readonly cookingTime = this.recipeDraft.cookingTime;
  protected readonly cuisine = this.recipeDraft.cuisine;
  protected readonly diet = this.recipeDraft.diet;

  protected readonly cookingTimes = [
    { label: 'Quick', description: 'up to 20min' },
    { label: 'Medium', description: '25-40min' },
    { label: 'Complex', description: 'over 45min' },
  ];

  protected readonly cuisines = ['German', 'Italian', 'Indian', 'Japanese', 'Gourmet', 'Fusion'];
  protected readonly diets = ['Vegetarian', 'Vegan', 'Keto', 'No preferences'];

  protected changePortions(amount: number): void {
    this.portions.update((value) => Math.min(20, Math.max(1, value + amount)));
  }

  protected changeCooks(amount: number): void {
    this.cooks.update((value) => Math.min(20, Math.max(1, value + amount)));
  }

  protected selectCookingTime(value: string): void {
    this.cookingTime.set(value);
  }

  protected selectCuisine(value: string): void {
    this.cuisine.set(value);
  }

  protected selectDiet(value: string): void {
    this.diet.set(value);
  }
}
