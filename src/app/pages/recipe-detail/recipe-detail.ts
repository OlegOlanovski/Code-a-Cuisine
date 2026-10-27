import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Recipe } from '../../models/recipe.model';
import { Recipes } from '../../services/recipes';

const PIECE_UNITS = new Set(['piece', 'stück', 'stueck']);

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

  protected displayUnit(unit: string): string {
    return PIECE_UNITS.has(unit.toLowerCase()) ? '' : unit;
  }

  protected chefsUsed(recipe: Recipe): number[] {
    return [...new Set(recipe.directions.map((direction) => direction.chef))].sort(
      (firstChef, secondChef) => firstChef - secondChef,
    );
  }

  protected chefIcon(chef: number): string {
    const validChef = Math.min(4, Math.max(1, chef));
    return `/images/recipe-detail/chef-${validChef}.svg`;
  }

  protected dietLabel(recipe: Recipe): string {
    if (recipe.diet === 'none') {
      return 'No preferences';
    }

    return this.capitalize(recipe.diet);
  }

  protected timeCategoryLabel(recipe: Recipe): string {
    if (recipe.timeCategory === 'elaborate') {
      return 'Complex';
    }

    return this.capitalize(recipe.timeCategory);
  }

  protected heartIcon(): string {
    return this.liked()
      ? '/images/recipe-detail/heart-full.svg'
      : '/images/recipe-detail/heart.svg';
  }

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

  private capitalize(value: string): string {
    return value.charAt(0).toUpperCase() + value.slice(1);
  }
}
