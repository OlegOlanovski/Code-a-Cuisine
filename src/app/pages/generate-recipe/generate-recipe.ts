import { Component, HostListener, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { RecipeDraft } from '../../services/recipe-draft';

@Component({
  selector: 'app-generate-recipe',
  imports: [FormsModule, RouterLink],
  templateUrl: './generate-recipe.html',
  styleUrl: './generate-recipe.scss',
})
export class GenerateRecipe {
  private readonly recipeDraft = inject(RecipeDraft);

  protected ingredientName = '';
  protected quantity: number | null = null;
  protected unit = 'gram';
  protected readonly units = ['piece', 'ml', 'gram'];
  protected readonly ingredientSuggestions = ['Pasta', 'Pastrami', 'Passionsfrut'];
  protected isUnitMenuOpen = false;
  protected isIngredientMenuOpen = false;
  protected editingIngredientIndex: number | null = null;
  protected readonly ingredients = this.recipeDraft.ingredients;

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

    const ingredient = { name, quantity: this.quantity as number, unit: this.unit };

    if (this.editingIngredientIndex === null) {
      this.ingredients.update((ingredients) => [ingredient, ...ingredients]);
    } else {
      const editingIndex = this.editingIngredientIndex;

      this.ingredients.update((ingredients) =>
        ingredients.map((currentIngredient, index) =>
          index === editingIndex ? ingredient : currentIngredient,
        ),
      );
    }

    this.ingredientName = '';
    this.quantity = null;
    this.editingIngredientIndex = null;
    this.isIngredientMenuOpen = false;
  }

  protected editIngredient(index: number): void {
    const ingredient = this.ingredients()[index];

    if (!ingredient) {
      return;
    }

    this.ingredientName = ingredient.name;
    this.quantity = ingredient.quantity;
    this.unit = ingredient.unit;
    this.editingIngredientIndex = index;
    this.closeMenus();
  }

  protected removeIngredient(index: number): void {
    this.ingredients.update((ingredients) =>
      ingredients.filter((_, ingredientIndex) => ingredientIndex !== index),
    );

    if (this.editingIngredientIndex !== null) {
      this.ingredientName = '';
      this.quantity = null;
      this.editingIngredientIndex = null;
    }
  }

  protected unitAbbreviation(unit: string): string {
    if (unit === 'gram') {
      return 'g';
    }

    if (unit === 'piece') {
      return '';
    }

    return unit;
  }
}
