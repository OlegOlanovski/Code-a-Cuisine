import { Component, inject, OnInit, signal } from '@angular/core';
import { Recipe } from '../../models/recipe.model';
import { Recipes } from '../../services/recipes';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-cookbook',
  imports: [RouterLink],
  templateUrl: './cookbook.html',
  styleUrl: './cookbook.scss',
})
export class Cookbook implements OnInit {
  private readonly recipesService = inject(Recipes);

  protected readonly recipes = signal<Recipe[]>([]);
  protected readonly isLoading = signal(true);
  protected readonly errorMessage = signal('');
  protected readonly likeErrorMessage = signal('');
  protected readonly likingRecipeId = signal<string | null>(null);

  async ngOnInit(): Promise<void> {
    try {
      const recipes = await this.recipesService.getAll();
      this.recipes.set(recipes);
    } catch (error) {
      console.error(error);
      this.errorMessage.set('Could not load recipes.');
    } finally {
      this.isLoading.set(false);
    }
  }

  protected async likeRecipe(recipe: Recipe): Promise<void> {
    if (!recipe.id || this.likingRecipeId()) {
      return;
    }

    this.likeErrorMessage.set('');
    this.likingRecipeId.set(recipe.id);

    try {
      const likes = await this.recipesService.likeRecipe(recipe.id);

      this.recipes.update((recipes) =>
        recipes.map((currentRecipe) =>
          currentRecipe.id === recipe.id ? { ...currentRecipe, likes } : currentRecipe,
        ),
      );
    } catch (error) {
      console.error(error);
      this.likeErrorMessage.set('Could not save your like.');
    } finally {
      this.likingRecipeId.set(null);
    }
  }
}
