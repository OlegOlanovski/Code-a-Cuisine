import { Component, computed, effect, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { map } from 'rxjs';
import { Cuisine, Recipe } from '../../models/recipe.model';
import { Recipes } from '../../services/recipes';

interface CuisineInfo {
  name: string;
  desktopImage: string;
  mobileImage: string;
}

const CUISINES: Record<Cuisine, CuisineInfo> = {
  italian: {
    name: 'Italian cuisine',
    desktopImage: '/images/cuisine/italian.png',
    mobileImage: '/images/cuisine/italian-mobile.png',
  },
  german: {
    name: 'German cuisine',
    desktopImage: '/images/cuisine/german.png',
    mobileImage: '/images/cuisine/german-mobile.png',
  },
  japanese: {
    name: 'Japanese cuisine',
    desktopImage: '/images/cuisine/japanese.png',
    mobileImage: '/images/cuisine/japanese-mobile.png',
  },
  gourmet: {
    name: 'Gourmet cuisine',
    desktopImage: '/images/cuisine/gourmet.png',
    mobileImage: '/images/cuisine/gourmet-mobile.png',
  },
  indian: {
    name: 'Indian cuisine',
    desktopImage: '/images/cuisine/indian.png',
    mobileImage: '/images/cuisine/indian-mobile.png',
  },
  fusion: {
    name: 'Fusion cuisine',
    desktopImage: '/images/cuisine/fusion.png',
    mobileImage: '/images/cuisine/fusion-mobile.png',
  },
};

@Component({
  selector: 'app-cuisine-recipes',
  imports: [RouterLink],
  templateUrl: './cuisine-recipes.html',
  styleUrl: './cuisine-recipes.scss',
})
export class CuisineRecipes {
  private readonly route = inject(ActivatedRoute);
  private readonly recipesService = inject(Recipes);

  protected readonly itemsPerPage = 15;
  protected readonly recipes = signal<Recipe[]>([]);
  protected readonly isLoading = signal(true);
  protected readonly errorMessage = signal('');
  protected readonly currentPage = signal(1);

  private readonly cuisineSlug = toSignal(
    this.route.paramMap.pipe(map((params) => params.get('cuisine') ?? '')),
    { initialValue: this.route.snapshot.paramMap.get('cuisine') ?? '' },
  );

  /** Resolves the route slug to a supported cuisine. */
  protected readonly cuisine = computed(() => {
    const slug = this.cuisineSlug();
    return slug in CUISINES ? (slug as Cuisine) : null;
  });

  /** Resolves display metadata for the selected cuisine. */
  protected readonly cuisineInfo = computed(() => {
    const cuisine = this.cuisine();
    return cuisine ? CUISINES[cuisine] : null;
  });

  /** Calculates the number of recipe pages available. */
  protected readonly totalPages = computed(() =>
    Math.max(1, Math.ceil(this.recipes().length / this.itemsPerPage)),
  );

  /** Selects the recipes displayed on the current page. */
  protected readonly pagedRecipes = computed(() => {
    const start = (this.currentPage() - 1) * this.itemsPerPage;
    return this.recipes().slice(start, start + this.itemsPerPage);
  });

  /** Builds the compact pagination model, including ellipsis markers. */
  protected readonly pageNumbers = computed<(number | 'ellipsis')[]>(() => {
    const total = this.totalPages();
    const current = this.currentPage();
    const pages: (number | 'ellipsis')[] = [1];

    if (current > 3) {
      pages.push('ellipsis');
    }

    for (let page = Math.max(2, current - 1); page <= Math.min(total - 1, current + 1); page++) {
      pages.push(page);
    }

    if (current < total - 2) {
      pages.push('ellipsis');
    }

    if (total > 1) {
      pages.push(total);
    }

    return pages;
  });

  /** Watches the selected cuisine and reloads its recipes when it changes. */
  constructor() {
    effect(() => {
      const cuisine = this.cuisine();
      this.currentPage.set(1);
      this.recipes.set([]);
      this.errorMessage.set('');

      if (!cuisine) {
        this.isLoading.set(false);
        this.errorMessage.set('This cuisine could not be found.');
        return;
      }

      this.isLoading.set(true);
      void this.loadRecipes(cuisine);
    });
  }

  /**
   * Builds the labels displayed on a recipe card.
   *
   * @param recipe - Recipe whose metadata is displayed.
   * @returns Diet and time-category labels for the card.
   */
  protected displayTags(recipe: Recipe): string[] {
    const tags: string[] = [];

    if (recipe.diet !== 'none') {
      tags.push(this.capitalize(recipe.diet));
    }

    tags.push(this.capitalize(recipe.timeCategory));
    return tags;
  }

  /**
   * Navigates the recipe list to a valid page.
   *
   * @param page - One-based page number to display.
   */
  protected goToPage(page: number): void {
    if (page < 1 || page > this.totalPages()) {
      return;
    }

    this.currentPage.set(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  /**
   * Loads recipes for the selected cuisine.
   *
   * @param cuisine - Cuisine used to filter the recipe collection.
   */
  private async loadRecipes(cuisine: Cuisine): Promise<void> {
    try {
      this.recipes.set(await this.recipesService.getByCuisine(cuisine));
    } catch (error) {
      console.error(error);
      this.errorMessage.set('Could not load recipes. Please try again.');
    } finally {
      this.isLoading.set(false);
    }
  }

  /**
   * Uppercases the first character of a value.
   *
   * @param value - Text to capitalize.
   * @returns The capitalized text.
   */
  private capitalize(value: string): string {
    return value.charAt(0).toUpperCase() + value.slice(1);
  }
}
