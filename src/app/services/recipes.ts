import { Injectable } from '@angular/core';
import { get, ref, runTransaction } from 'firebase/database';
import { signInAnonymously } from 'firebase/auth';
import { auth, database } from '../firebase';
import { Cuisine, Recipe } from '../models/recipe.model';

@Injectable({
  providedIn: 'root',
})
export class Recipes {
  private readonly recipesRef = ref(database, 'recipes');

  /**
   * Loads every recipe from the database.
   *
   * @returns All stored recipes, including their database IDs.
   */
  async getAll(): Promise<Recipe[]> {
    const snapshot = await get(this.recipesRef);
    return this.toRecipeArray(snapshot.val());
  }

  /**
   * Loads a recipe by its database ID.
   *
   * @param id - Database ID of the recipe to load.
   * @returns The matching recipe, or `null` when it does not exist.
   */
  async getById(id: string): Promise<Recipe | null> {
    const snapshot = await get(ref(database, `recipes/${id}`));
    const value = snapshot.val();

    return value ? { id, ...value } : null;
  }

  /**
   * Loads the recipes with the highest like counts.
   *
   * @param limit - Maximum number of recipes to return.
   * @returns Recipes sorted from most to least liked.
   */
  async getMostLiked(limit = 3): Promise<Recipe[]> {
    const recipes = await this.getAll();

    return recipes.sort((first, second) => second.likes - first.likes).slice(0, limit);
  }

  /**
   * Loads all recipes belonging to a cuisine.
   *
   * @param cuisine - Cuisine used to filter the recipes.
   * @returns Matching recipes ordered from newest to oldest.
   */
  async getByCuisine(cuisine: Cuisine): Promise<Recipe[]> {
    const recipes = await this.getAll();

    return recipes
      .filter((recipe) => recipe.cuisine === cuisine)
      .sort((first, second) => second.createdAt - first.createdAt);
  }

  /**
   * Atomically increments the like count for a recipe.
   *
   * @param id - Database ID of the recipe to like.
   * @returns The updated like count.
   */
  async likeRecipe(id: string): Promise<number> {
    if (!auth.currentUser) {
      await signInAnonymously(auth);
    }

    const result = await runTransaction(
      ref(database, `recipes/${id}/likes`),
      (currentLikes) => (currentLikes ?? 0) + 1,
    );

    return result.snapshot.val();
  }

  /**
   * Converts the database recipe map into an array with IDs.
   *
   * @param data - Recipe values keyed by their database IDs.
   * @returns The normalized recipe array.
   */
  private toRecipeArray(data: Record<string, Omit<Recipe, 'id'>> | null): Recipe[] {
    if (!data) {
      return [];
    }

    return Object.entries(data).map(([id, recipe]) => ({
      id,
      ...recipe,
    }));
  }
}
