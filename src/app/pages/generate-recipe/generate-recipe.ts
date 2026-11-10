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
  protected ingredientError = '';
  protected quantity: number | null = null;
  protected unit = 'gram';
  protected readonly units = ['piece', 'ml', 'gram'];
  protected readonly ingredientSuggestions = [
    'Apple',
    'Asparagus',
    'Avocado',
    'Bacon',
    'Beef',
    'Broccoli',
    'Cabbage',
    'Carrot',
    'Chicken',
    'Dates',
    'Dill',
    'Duck',
    'Egg',
    'Eggplant',
    'Emmental',
    'Fennel',
    'Feta',
    'Flour',
    'Garlic',
    'Ginger',
    'Grapes',
    'Ham',
    'Hazelnut',
    'Honey',
    'Iceberg lettuce',
    'Jalapeno',
    'Kale',
    'Kiwi',
    'Lamb',
    'Lemon',
    'Lentils',
    'Mango',
    'Milk',
    'Mushrooms',
    'Noodles',
    'Nutmeg',
    'Oats',
    'Olive oil',
    'Onion',
    'Paprika',
    'Pasta',
    'Potato',
    'Quinoa',
    'Radish',
    'Rice',
    'Rosemary',
    'Salmon',
    'Spinach',
    'Strawberry',
    'Thyme',
    'Tomato',
    'Tuna',
    'Udon noodles',
    'Vanilla',
    'Walnut',
    'Watermelon',
    'Xanthan gum',
    'Yogurt',
    'Zucchini',
  ];
  protected isUnitMenuOpen = false;
  protected isIngredientMenuOpen = false;
  protected editingIngredientIndex: number | null = null;
  protected readonly ingredients = this.recipeDraft.ingredients;

  /**
   * Filters ingredient suggestions by the current input.
   *
   * @returns Up to three matching ingredient names.
   */
  protected get filteredIngredientSuggestions(): string[] {
    const query = this.ingredientName.trim().toLocaleLowerCase();

    if (!query) {
      return [];
    }

    return this.ingredientSuggestions
      .filter((suggestion) => suggestion.toLocaleLowerCase().startsWith(query))
      .slice(0, 3);
  }

  /**
   * Toggles the unit menu without triggering the document click handler.
   *
   * @param event - Click event originating from the unit selector.
   */
  protected toggleUnitMenu(event: MouseEvent): void {
    event.stopPropagation();
    this.isIngredientMenuOpen = false;
    this.isUnitMenuOpen = !this.isUnitMenuOpen;
  }

  /**
   * Selects an ingredient unit and closes the unit menu.
   *
   * @param unit - Unit selected by the user.
   * @param event - Click event originating from the unit option.
   */
  protected selectUnit(unit: string, event: MouseEvent): void {
    event.stopPropagation();
    this.unit = unit;
    this.isUnitMenuOpen = false;
  }

  /**
   * Updates and validates the ingredient name input.
   *
   * @param value - Current ingredient name input.
   */
  protected updateIngredientMenu(value: string): void {
    this.ingredientName = value;
    this.ingredientError = this.hasOnlyEnglishCharacters(value)
      ? ''
      : 'Please enter the ingredient name in English.';
    this.isUnitMenuOpen = false;
    this.isIngredientMenuOpen = this.filteredIngredientSuggestions.length > 0;
  }

  /**
   * Applies an ingredient suggestion to the form.
   *
   * @param ingredient - Suggested ingredient name to select.
   * @param event - Click event originating from the suggestion.
   */
  protected selectIngredient(ingredient: string, event: MouseEvent): void {
    event.stopPropagation();
    this.ingredientName = ingredient;
    this.ingredientError = '';
    this.isIngredientMenuOpen = false;
  }

  /** Closes the unit and ingredient suggestion menus. */
  @HostListener('document:click')
  protected closeMenus(): void {
    this.isUnitMenuOpen = false;
    this.isIngredientMenuOpen = false;
  }

  /** Adds a valid ingredient or saves changes to the ingredient being edited. */
  protected addIngredient(): void {
    const name = this.ingredientName.trim();

    if (name && !this.hasOnlyEnglishCharacters(name)) {
      this.ingredientError = 'Please enter the ingredient name in English.';
      return;
    }

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
    this.ingredientError = '';
    this.quantity = null;
    this.editingIngredientIndex = null;
    this.isIngredientMenuOpen = false;
  }

  /**
   * Loads an existing ingredient into the form for editing.
   *
   * @param index - Index of the ingredient to edit.
   */
  protected editIngredient(index: number): void {
    const ingredient = this.ingredients()[index];

    if (!ingredient) {
      return;
    }

    this.ingredientName = ingredient.name;
    this.ingredientError = '';
    this.quantity = ingredient.quantity;
    this.unit = ingredient.unit;
    this.editingIngredientIndex = index;
    this.closeMenus();
  }

  /**
   * Removes an ingredient and clears any active edit state.
   *
   * @param index - Index of the ingredient to remove.
   */
  protected removeIngredient(index: number): void {
    this.ingredients.update((ingredients) =>
      ingredients.filter((_, ingredientIndex) => ingredientIndex !== index),
    );

    if (this.editingIngredientIndex !== null) {
      this.ingredientName = '';
      this.ingredientError = '';
      this.quantity = null;
      this.editingIngredientIndex = null;
    }
  }

  /**
   * Converts a stored ingredient unit to its display abbreviation.
   *
   * @param unit - Stored ingredient unit.
   * @returns The abbreviated display unit.
   */
  protected unitAbbreviation(unit: string): string {
    if (unit === 'gram') {
      return 'g';
    }

    if (unit === 'piece') {
      return '';
    }

    return unit;
  }

  /**
   * Checks whether an ingredient name contains only supported English characters.
   *
   * @param value - Ingredient name to validate.
   * @returns `true` when the name is empty or contains only supported characters.
   */
  private hasOnlyEnglishCharacters(value: string): boolean {
    const name = value.trim();
    return !name || /^[A-Za-z][A-Za-z '\u2019-]*$/.test(name);
  }
}
