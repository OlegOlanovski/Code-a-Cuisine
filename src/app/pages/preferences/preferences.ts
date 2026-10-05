import { Component, HostListener, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { RecipeDraft } from '../../services/recipe-draft';

@Component({
  selector: 'app-preferences',
  imports: [RouterLink],
  templateUrl: './preferences.html',
  styleUrl: './preferences.scss',
})
export class Preferences {
  private readonly minimumIngredientCount = 2;
  private readonly minimumAmountPerPortion = 150;
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
  protected readonly isErrorPopupOpen = signal(false);

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

  protected generateRecipe(): void {
    if (!this.hasValidRecipeRequest()) {
      this.isErrorPopupOpen.set(true);
      return;
    }

    this.isErrorPopupOpen.set(false);
  }

  protected closeErrorPopup(): void {
    this.isErrorPopupOpen.set(false);
  }

  @HostListener('document:keydown.escape')
  protected closeErrorPopupOnEscape(): void {
    this.closeErrorPopup();
  }

  private hasValidRecipeRequest(): boolean {
    const ingredients = this.recipeDraft.ingredients();
    const portions = this.portions();
    const cooks = this.cooks();

    if (
      ingredients.length < this.minimumIngredientCount ||
      !Number.isInteger(portions) ||
      portions < 1 ||
      !Number.isInteger(cooks) ||
      cooks < 1 ||
      !this.cookingTimes.some((option) => option.label === this.cookingTime()) ||
      !this.cuisines.includes(this.cuisine()) ||
      !this.diets.includes(this.diet())
    ) {
      return false;
    }

    const totalAvailableAmount = ingredients.reduce((total, ingredient) => {
      if (
        !ingredient.name.trim() ||
        !Number.isFinite(ingredient.quantity) ||
        ingredient.quantity <= 0
      ) {
        return Number.NaN;
      }

      if (ingredient.unit === 'piece') {
        return total + ingredient.quantity * 100;
      }

      if (ingredient.unit === 'gram' || ingredient.unit === 'ml') {
        return total + ingredient.quantity;
      }

      return Number.NaN;
    }, 0);

    return totalAvailableAmount >= portions * this.minimumAmountPerPortion;
  }
}
