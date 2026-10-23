import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TimeCategory } from '../../models/recipe.model';
import { RecipeGenerator } from '../../services/recipe-generator';

@Component({
  selector: 'app-results',
  imports: [RouterLink],
  templateUrl: './results.html',
  styleUrl: './results.scss',
})
export class Results {
  private readonly recipeGenerator = inject(RecipeGenerator);

  private readonly timeCategoryLabels: Record<TimeCategory, string> = {
    quick: 'Quick',
    medium: 'Medium',
    elaborate: 'Complex',
  };

  protected readonly recipes = this.recipeGenerator.results;

  protected readonly cuisine = computed(() => {
    const cuisine = this.recipes()[0]?.cuisine ?? '';

    return cuisine ? cuisine.charAt(0).toUpperCase() + cuisine.slice(1) : '';
  });

  protected readonly cookingTime = computed(() => {
    const category = this.recipes()[0]?.timeCategory;

    return category ? this.timeCategoryLabels[category] : '';
  });
}
