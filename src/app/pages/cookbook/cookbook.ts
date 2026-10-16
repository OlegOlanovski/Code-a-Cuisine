import { Component, inject, OnInit, signal } from '@angular/core';
import { Recipe } from '../../models/recipe.model';
import { Recipes } from '../../services/recipes';

@Component({
  selector: 'app-cookbook',
  templateUrl: './cookbook.html',
  styleUrl: './cookbook.scss',
})
export class Cookbook implements OnInit {
  private readonly recipesService = inject(Recipes);

  protected readonly recipes = signal<Recipe[]>([]);
  protected readonly isLoading = signal(true);
  protected readonly errorMessage = signal('');

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
}
