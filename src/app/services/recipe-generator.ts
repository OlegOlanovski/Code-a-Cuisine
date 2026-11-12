import { HttpClient } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { Cuisine, Diet, Recipe, TimeCategory } from '../models/recipe.model';
import { Ingredient } from './recipe-draft';

export interface GenerateRecipeRequest {
  ingredients: Ingredient[];
  servings: number;
  timeCategory: TimeCategory;
  cuisine: Cuisine;
  diet: Diet;
  helperCount: number;
}

export interface GenerateRecipeResponse {
  recipes: Recipe[];
  quota: QuotaStatus;
}

export interface QuotaStatus {
  date: string;
  perIpLimit: number;
  systemLimit: number;
  ipUsed: number;
  totalUsed: number;
  remainingRecipes: number;
  canGenerate: boolean;
  message: string;
}

@Injectable({
  providedIn: 'root',
})
export class RecipeGenerator {
  private readonly http = inject(HttpClient);

  readonly results = signal<Recipe[]>([]);
  readonly quotaStatus = signal<QuotaStatus | null>(null);

  /**
   * Sends a recipe generation request to the configured workflow endpoint.
   *
   * @param request - Ingredients and preferences used to generate recipes.
   * @returns An observable containing the generated recipes.
   */
  generate(request: GenerateRecipeRequest): Observable<GenerateRecipeResponse> {
    return this.http.post<GenerateRecipeResponse>(environment.n8nWebhookUrl, request);
  }

  /** Loads the quota available to the current public IP address. */
  getQuotaStatus(): Observable<QuotaStatus> {
    const quotaUrl = environment.n8nWebhookUrl.replace(/\/generate-recipes\/?$/, '/quota-status');
    return this.http.get<QuotaStatus>(quotaUrl);
  }
}
