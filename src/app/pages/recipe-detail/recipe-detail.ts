import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Recipe } from '../../models/recipe.model';
import { Recipes } from '../../services/recipes';

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
    } catch (error) {
      console.error(error);
      this.errorMessage.set('Could not load the recipe.');
    } finally {
      this.isLoading.set(false);
    }
  }
}
