import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

interface Ingredient {
  name: string;
  quantity: number;
  unit: string;
}

@Component({
  selector: 'app-generate-recipe',
  imports: [FormsModule, RouterLink],
  templateUrl: './generate-recipe.html',
  styleUrl: './generate-recipe.scss',
})
export class GenerateRecipe {
  protected ingredientName = '';
  protected quantity: number | null = null;
  protected unit = 'gram';
  protected readonly ingredients = signal<Ingredient[]>([]);

  protected addIngredient(): void {
    const name = this.ingredientName.trim();

    if (!name || this.quantity === null || this.quantity <= 0) {
      return;
    }

    this.ingredients.update((ingredients) => [
      ...ingredients,
      { name, quantity: this.quantity as number, unit: this.unit },
    ]);

    this.ingredientName = '';
    this.quantity = null;
  }

  protected removeIngredient(index: number): void {
    this.ingredients.update((ingredients) =>
      ingredients.filter((_, ingredientIndex) => ingredientIndex !== index),
    );
  }
}
