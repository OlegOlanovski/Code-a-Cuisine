import { Injectable } from '@angular/core';
import { get, ref, runTransaction } from 'firebase/database';
import { signInAnonymously } from 'firebase/auth';
import { auth, database } from '../firebase';
import { Recipe } from '../models/recipe.model';

@Injectable({
  providedIn: 'root',
})
export class Recipes {
  private readonly recipesRef = ref(database, 'recipes');

  async getAll(): Promise<Recipe[]> {
    const snapshot = await get(this.recipesRef);
    return this.toRecipeArray(snapshot.val());
  }

  async getById(id: string): Promise<Recipe | null> {
    const snapshot = await get(ref(database, `recipes/${id}`));
    const value = snapshot.val();

    return value ? { id, ...value } : null;
  }

  async getMostLiked(limit = 3): Promise<Recipe[]> {
    const recipes = await this.getAll();

    return recipes.sort((first, second) => second.likes - first.likes).slice(0, limit);
  }

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
