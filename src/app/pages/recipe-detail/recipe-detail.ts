import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Recipe } from '../../models/recipe.model';
import { Recipes } from '../../services/recipes';

const GRAM_UNITS = new Set(['g', 'gram', 'grams', 'gramme', 'grammes']);
const MILLILITER_UNITS = new Set(['ml', 'milliliter', 'milliliters', 'millilitre', 'millilitres']);
const PIECE_UNITS = new Set(['piece', 'pieces', 'pc', 'pcs', 'stück', 'stueck']);

@Component({
  selector: 'app-recipe-detail',
  imports: [RouterLink],
  templateUrl: './recipe-detail.html',
  styleUrl: './recipe-detail.scss',
})
export class RecipeDetail implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly recipesService = inject(Recipes);

  protected readonly recipe = signal<Recipe | null>(null);
  protected readonly isLoading = signal(true);
  protected readonly errorMessage = signal('');
  protected readonly likeErrorMessage = signal('');
  protected readonly isLiking = signal(false);
  protected readonly liked = signal(false);

  /** Loads the recipe identified by the current route. */
  async ngOnInit(): Promise<void> {
    const id = this.route.snapshot.paramMap.get('id');

    if (!id) {
      this.errorMessage.set('Recipe ID is missing.');
      this.isLoading.set(false);
      return;
    }

    try {
      const recipe = await this.recipesService.getById(id);

      if (!recipe) {
        this.errorMessage.set('Recipe not found.');
        return;
      }

      this.recipe.set(recipe);
      this.liked.set(localStorage.getItem(`liked-${id}`) === 'true');
    } catch (error) {
      console.error(error);
      this.errorMessage.set('Could not load the recipe.');
    } finally {
      this.isLoading.set(false);
    }
  }

  /**
   * Formats an ingredient amount using the display unit expected by the recipe page.
   *
   * @param amount - Numeric ingredient amount, or `null` when no amount is specified.
   * @param unit - Unit supplied by the recipe data.
   * @returns The formatted amount and normalized unit.
   */
  protected formatIngredientAmount(amount: number | null, unit: string): string {
    if (amount === null) {
      return '';
    }

    const normalizedUnit = unit.trim().toLowerCase();

    if (GRAM_UNITS.has(normalizedUnit)) {
      return `${this.formatNumber(amount)}g`;
    }

    if (
      normalizedUnit === 'kg' ||
      normalizedUnit === 'kilogram' ||
      normalizedUnit === 'kilograms'
    ) {
      return `${this.formatNumber(amount * 1000)}g`;
    }

    if (MILLILITER_UNITS.has(normalizedUnit)) {
      return `${this.formatNumber(amount)}ml`;
    }

    if (normalizedUnit === 'l' || normalizedUnit === 'liter' || normalizedUnit === 'litre') {
      return `${this.formatNumber(amount * 1000)}ml`;
    }

    if (normalizedUnit === 'tbsp' || normalizedUnit === 'tablespoon') {
      return `${this.formatNumber(amount * 15)}ml`;
    }

    if (normalizedUnit === 'tsp' || normalizedUnit === 'teaspoon') {
      return `${this.formatNumber(amount * 5)}ml`;
    }

    if (PIECE_UNITS.has(normalizedUnit) || !normalizedUnit) {
      return `${this.formatNumber(amount)} piece`;
    }

    return this.formatNumber(amount);
  }

  /**
   * Finds the chefs assigned to at least one recipe direction.
   *
   * @param recipe - Recipe whose directions are inspected.
   * @returns Unique chef numbers in ascending order.
   */
  protected chefsUsed(recipe: Recipe): number[] {
    return [...new Set(recipe.directions.map((direction) => direction.chef))].sort(
      (firstChef, secondChef) => firstChef - secondChef,
    );
  }

  /**
   * Resolves the icon path for a chef number.
   *
   * @param chef - Chef number to represent.
   * @returns The path to the corresponding chef icon.
   */
  protected chefIcon(chef: number): string {
    const validChef = Math.min(4, Math.max(1, chef));
    return `/images/recipe-detail/chef-${validChef}.svg`;
  }

  /**
   * Builds the human-readable diet label for a recipe.
   *
   * @param recipe - Recipe whose diet is displayed.
   * @returns A display label for the recipe diet.
   */
  protected dietLabel(recipe: Recipe): string {
    if (recipe.diet === 'none') {
      return 'No preferences';
    }

    return this.capitalize(recipe.diet);
  }

  /**
   * Builds the human-readable time category label for a recipe.
   *
   * @param recipe - Recipe whose time category is displayed.
   * @returns A display label for the cooking-time category.
   */
  protected timeCategoryLabel(recipe: Recipe): string {
    if (recipe.timeCategory === 'elaborate') {
      return 'Complex';
    }

    return this.capitalize(recipe.timeCategory);
  }

  /**
   * Resolves the heart icon for the current liked state.
   *
   * @returns The path to the empty or filled heart icon.
   */
  protected heartIcon(): string {
    return this.liked()
      ? '/images/recipe-detail/heart-full.svg'
      : '/images/recipe-detail/heart.svg';
  }

  /** Optimistically likes the current recipe and persists the updated count. */
  protected async likeRecipe(): Promise<void> {
    const recipe = this.recipe();

    if (!recipe?.id || this.liked() || this.isLiking()) {
      return;
    }

    const previousLikes = recipe.likes;
    this.likeErrorMessage.set('');
    this.isLiking.set(true);
    this.liked.set(true);
    this.recipe.set({ ...recipe, likes: previousLikes + 1 });
    localStorage.setItem(`liked-${recipe.id}`, 'true');

    try {
      const likes = await this.recipesService.likeRecipe(recipe.id);
      this.recipe.update((currentRecipe) =>
        currentRecipe ? { ...currentRecipe, likes } : currentRecipe,
      );
    } catch (error) {
      console.error(error);
      this.recipe.set({ ...recipe, likes: previousLikes });
      this.liked.set(false);
      localStorage.removeItem(`liked-${recipe.id}`);
      this.likeErrorMessage.set('Could not save your like. Please try again.');
    } finally {
      this.isLiking.set(false);
    }
  }

  /**
   * Uppercases the first character of a value.
   *
   * @param value - Text to capitalize.
   * @returns The capitalized text.
   */
  private capitalize(value: string): string {
    return value.charAt(0).toUpperCase() + value.slice(1);
  }

  /**
   * Rounds a number to at most two decimal places for display.
   *
   * @param value - Number to format.
   * @returns A compact decimal string.
   */
  private formatNumber(value: number): string {
    return Number(value.toFixed(2)).toString();
  }
}
