import { Component, HostListener, inject, OnInit, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { LoadingScreen } from '../../components/loading-screen/loading-screen';
import { RecipeDraft } from '../../services/recipe-draft';
import { Cuisine, Diet, TimeCategory } from '../../models/recipe.model';
import { RecipeGenerator } from '../../services/recipe-generator';
@Component({
  selector: 'app-preferences',
  imports: [RouterLink, LoadingScreen],
  templateUrl: './preferences.html',
  styleUrl: './preferences.scss',
})
export class Preferences implements OnInit {
  private readonly minimumIngredientCount = 2;
  private readonly minimumAmountPerPortion = 150;
  private readonly recipeDraft = inject(RecipeDraft);
  private readonly recipeGenerator = inject(RecipeGenerator);
  private readonly router = inject(Router);

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
  protected readonly isGenerating = signal(false);
  protected readonly generationErrorMessage = signal<string | null>(null);
  protected readonly quotaStatus = this.recipeGenerator.quotaStatus;
  protected readonly isQuotaLoading = signal(true);

  /** Loads the daily allowance for the request's public IP address. */
  ngOnInit(): void {
    this.refreshQuotaStatus();
  }

  /**
   * Adjusts the number of portions within the supported range.
   *
   * @param amount - Signed amount added to the current portion count.
   */
  protected changePortions(amount: number): void {
    this.portions.update((value) => Math.min(12, Math.max(1, value + amount)));
  }

  /**
   * Adjusts the number of cooks within the supported range.
   *
   * @param amount - Signed amount added to the current cook count.
   */
  protected changeCooks(amount: number): void {
    this.cooks.update((value) => Math.min(4, Math.max(1, value + amount)));
  }

  /**
   * Selects a cooking-time preference.
   *
   * @param value - Cooking-time label selected by the user.
   */
  protected selectCookingTime(value: string): void {
    this.cookingTime.set(value);
  }

  /**
   * Selects a cuisine preference.
   *
   * @param value - Cuisine label selected by the user.
   */
  protected selectCuisine(value: string): void {
    this.cuisine.set(value);
  }

  /**
   * Selects a dietary preference.
   *
   * @param value - Diet label selected by the user.
   */
  protected selectDiet(value: string): void {
    this.diet.set(value);
  }

  /** Validates the draft and requests generated recipes. */
  protected generateRecipe(): void {
    const quota = this.quotaStatus();

    if (quota && !quota.canGenerate) {
      this.generationErrorMessage.set(quota.message);
      return;
    }

    if (!this.hasValidRecipeRequest()) {
      this.generationErrorMessage.set(null);
      this.isErrorPopupOpen.set(true);
      return;
    }

    const timeCategory = (
      this.cookingTime() === 'Complex' ? 'elaborate' : this.cookingTime().toLowerCase()
    ) as TimeCategory;

    const diet = (this.diet() === 'No preferences' ? 'none' : this.diet().toLowerCase()) as Diet;

    this.generationErrorMessage.set(null);
    this.isErrorPopupOpen.set(false);
    this.isGenerating.set(true);

    this.recipeGenerator
      .generate({
        ingredients: this.recipeDraft.ingredients(),
        servings: this.portions(),
        timeCategory,
        cuisine: this.cuisine().toLowerCase() as Cuisine,
        diet,
        helperCount: this.cooks(),
      })
      .subscribe({
        next: (response) => {
          this.recipeGenerator.results.set(response.recipes);
          this.recipeGenerator.quotaStatus.set(response.quota);
          this.recipeDraft.reset();
          this.router.navigate(['/results']);
        },
        error: (error) => {
          console.error('Recipe generation failed:', error);

          const details = error?.error?.details;
          const quota = error?.error?.quota;

          if (quota) {
            this.recipeGenerator.quotaStatus.set(quota);
          }

          const message =
            error?.error?.message ??
            (Array.isArray(details) ? details.join(' ') : null) ??
            'We could not generate recipes. Please check that n8n is running and try again.';

          this.generationErrorMessage.set(message);
          this.isGenerating.set(false);
        },
      });
  }

  /** Refreshes the quota without consuming a recipe generation. */
  protected refreshQuotaStatus(): void {
    this.isQuotaLoading.set(true);

    this.recipeGenerator.getQuotaStatus().subscribe({
      next: (quota) => {
        this.recipeGenerator.quotaStatus.set(quota);
        this.isQuotaLoading.set(false);
      },
      error: () => {
        this.isQuotaLoading.set(false);
      },
    });
  }

  /** Closes the invalid-request popup. */
  protected closeErrorPopup(): void {
    this.isErrorPopupOpen.set(false);
  }

  /** Dismisses the recipe generation error. */
  protected closeGenerationError(): void {
    this.generationErrorMessage.set(null);
  }

  /** Closes any open error message when Escape is pressed. */
  @HostListener('document:keydown.escape')
  protected closeErrorPopupOnEscape(): void {
    this.closeErrorPopup();
    this.closeGenerationError();
  }

  /**
   * Checks whether the current draft contains a valid recipe request.
   *
   * @returns `true` when all preferences and ingredient quantities are valid.
   */
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
