import { Injectable, signal } from '@angular/core';
import { signInAnonymously, User } from 'firebase/auth';
import { get, onValue, push, ref, serverTimestamp, set } from 'firebase/database';
import { from, Observable } from 'rxjs';
import { auth, database } from '../firebase';
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

interface GenerationQueueRecord {
  status: 'pending' | 'processing' | 'completed' | 'failed';
  recipes?: Recipe[];
  quota?: QuotaStatus;
  errorMessage?: string;
}

const RECIPES_PER_REQUEST = 3;
const PER_DEMO_LIMIT = 9;
const SYSTEM_LIMIT = 12;
const GENERATION_TIMEOUT_MS = 5 * 60 * 1000;

@Injectable({
  providedIn: 'root',
})
export class RecipeGenerator {
  readonly results = signal<Recipe[]>([]);
  readonly quotaStatus = signal<QuotaStatus | null>(null);

  /**
   * Adds a recipe request to the Firebase queue and waits for n8n to process it.
   *
   * @param request - Ingredients and preferences used to generate recipes.
   * @returns An observable containing the generated recipes.
   */
  generate(request: GenerateRecipeRequest): Observable<GenerateRecipeResponse> {
    return new Observable<GenerateRecipeResponse>((subscriber) => {
      let stopListening: (() => void) | undefined;
      let timeoutId: ReturnType<typeof setTimeout> | undefined;
      let isDisposed = false;

      void this.createQueueRequest(request)
        .then((requestId) => {
          if (isDisposed) {
            return;
          }

          const requestRef = ref(database, `generationRequests/${requestId}`);

          stopListening = onValue(
            requestRef,
            (snapshot) => {
              const queueRecord = snapshot.val() as GenerationQueueRecord | null;

              if (queueRecord?.status === 'completed' && queueRecord.recipes) {
                subscriber.next({
                  recipes: queueRecord.recipes,
                  quota: queueRecord.quota ?? this.createDefaultQuotaStatus(),
                });
                subscriber.complete();
              } else if (queueRecord?.status === 'failed') {
                subscriber.error({
                  error: {
                    message:
                      queueRecord.errorMessage ??
                      'The recipe request could not be processed. Please try again.',
                    quota: queueRecord.quota,
                  },
                });
              }
            },
            (error) => subscriber.error(error),
          );

          timeoutId = setTimeout(() => {
            subscriber.error({
              error: {
                message:
                  'Recipe generation is taking longer than expected. Please make sure the local n8n workflow is running and try again.',
              },
            });
          }, GENERATION_TIMEOUT_MS);
        })
        .catch((error) => subscriber.error(error));

      return () => {
        isDisposed = true;
        stopListening?.();

        if (timeoutId) {
          clearTimeout(timeoutId);
        }
      };
    });
  }

  /** Loads the quota used by the shared local demonstration backend. */
  getQuotaStatus(): Observable<QuotaStatus> {
    return from(this.loadQuotaStatus());
  }

  /** Creates a pending queue item owned by the current anonymous Firebase user. */
  private async createQueueRequest(request: GenerateRecipeRequest): Promise<string> {
    const user = await this.getCurrentUser();
    const queueRef = push(ref(database, 'generationRequests'));

    if (!queueRef.key) {
      throw new Error('Firebase did not create a recipe request ID.');
    }

    await set(queueRef, {
      ownerId: user.uid,
      status: 'pending',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      payload: request,
    });

    return queueRef.key;
  }

  /** Returns the authenticated anonymous Firebase user used by the queue. */
  private async getCurrentUser(): Promise<User> {
    if (auth.currentUser) {
      return auth.currentUser;
    }

    return (await signInAnonymously(auth)).user;
  }

  /** Reads the existing Firebase quota data without contacting the local n8n host. */
  private async loadQuotaStatus(): Promise<QuotaStatus> {
    const user = await this.getCurrentUser();

    const date = this.getBerlinDate();
    const snapshot = await get(ref(database, `quota/${date}/byIp`));
    const dailyQuota = (snapshot.val() ?? {}) as Record<string, { count?: number }>;
    const counts = Object.values(dailyQuota).map((entry) => Number(entry?.count) || 0);
    const totalUsed = counts.reduce((total, count) => total + count, 0);
    const demoUsed = Number(dailyQuota[this.createQuotaIp(user.uid)]?.count) || 0;
    const remainingRecipes = Math.max(
      0,
      Math.min(PER_DEMO_LIMIT - demoUsed, SYSTEM_LIMIT - totalUsed),
    );
    const canGenerate = remainingRecipes >= RECIPES_PER_REQUEST;

    return {
      date,
      perIpLimit: PER_DEMO_LIMIT,
      systemLimit: SYSTEM_LIMIT,
      ipUsed: demoUsed,
      totalUsed,
      remainingRecipes,
      canGenerate,
      message: canGenerate
        ? `${remainingRecipes} recipes are available for the shared demo today.`
        : 'The shared daily demo limit has been reached. Please try again tomorrow.',
    };
  }

  /** Creates an empty quota status when a completed queue item has no quota payload. */
  private createDefaultQuotaStatus(): QuotaStatus {
    return {
      date: this.getBerlinDate(),
      perIpLimit: PER_DEMO_LIMIT,
      systemLimit: SYSTEM_LIMIT,
      ipUsed: 0,
      totalUsed: 0,
      remainingRecipes: PER_DEMO_LIMIT,
      canGenerate: true,
      message: `${PER_DEMO_LIMIT} recipes are available for the shared demo today.`,
    };
  }

  /** Creates the private synthetic IP used by n8n to separate anonymous-user quotas. */
  private createQuotaIp(ownerId: string): string {
    let hash = 2166136261;
    const groups = ['fd00'];

    for (let groupIndex = 0; groupIndex < 7; groupIndex += 1) {
      let value = 0;

      for (const character of ownerId) {
        hash ^= character.charCodeAt(0) + groupIndex;
        hash = Math.imul(hash, 16777619) >>> 0;
        value = (value + hash) >>> 0;
      }

      groups.push((value & 0xffff).toString(16));
    }

    return groups.join(':');
  }

  /** Returns the current calendar date used by the n8n quota in Europe/Berlin. */
  private getBerlinDate(): string {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Europe/Berlin',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(new Date());
    const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));

    return `${values['year']}-${values['month']}-${values['day']}`;
  }
}
