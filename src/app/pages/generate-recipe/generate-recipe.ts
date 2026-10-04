import { Component, HostListener, signal } from '@angular/core';
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
  protected readonly units = ['piece', 'ml', 'gram'];
  protected readonly ingredientSuggestions = ['Pasta', 'Pastrami', 'Passionsfrut'];
  protected isUnitMenuOpen = false;
  protected isIngredientMenuOpen = false;
  protected readonly ingredients = signal<Ingredient[]>([]);

  protected get filteredIngredientSuggestions(): string[] {
    const query = this.ingredientName.trim().toLocaleLowerCase();

    if (!query) {
      return [];
    }

    return this.ingredientSuggestions.filter((suggestion) =>
      suggestion.toLocaleLowerCase().startsWith(query),
    );
  }

  protected toggleUnitMenu(event: MouseEvent): void {
    event.stopPropagation();
    this.isIngredientMenuOpen = false;
    this.isUnitMenuOpen = !this.isUnitMenuOpen;
  }

  protected selectUnit(unit: string, event: MouseEvent): void {
    event.stopPropagation();
    this.unit = unit;
    this.isUnitMenuOpen = false;
  }

  protected updateIngredientMenu(value: string): void {
    this.ingredientName = value;
    this.isUnitMenuOpen = false;
    this.isIngredientMenuOpen = this.filteredIngredientSuggestions.length > 0;
  }

  protected selectIngredient(ingredient: string, event: MouseEvent): void {
    event.stopPropagation();
    this.ingredientName = ingredient;
    this.isIngredientMenuOpen = false;
  }

  @HostListener('document:click')
  protected closeMenus(): void {
    this.isUnitMenuOpen = false;
    this.isIngredientMenuOpen = false;
  }

  protected addIngredient(): void {
    const name = this.ingredientName.trim();

    if (!name || this.quantity === null || this.quantity <= 0) {
      return;
    }

    this.ingredients.update((ingredients) => [
      { name, quantity: this.quantity as number, unit: this.unit },
      ...ingredients,
    ]);

    this.ingredientName = '';
    this.quantity = null;
    this.isIngredientMenuOpen = false;
  }

  protected removeIngredient(index: number): void {
    this.ingredients.update((ingredients) =>
      ingredients.filter((_, ingredientIndex) => ingredientIndex !== index),
    );
  }
}
