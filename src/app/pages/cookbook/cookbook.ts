import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Recipe } from '../../models/recipe.model';
import { Recipes } from '../../services/recipes';

interface CuisineCard {
  name: string;
  emoji: string;
  image: string;
  slug: string;
}

@Component({
  selector: 'app-cookbook',
  imports: [RouterLink],
  templateUrl: './cookbook.html',
  styleUrl: './cookbook.scss',
})
export class Cookbook implements OnInit {
  private readonly recipesService = inject(Recipes);

  protected readonly mostLiked = signal<Recipe[]>([]);
  protected readonly isLoading = signal(true);
  protected readonly errorMessage = signal('');

  protected readonly cuisines: CuisineCard[] = [
    {
      name: 'Italian cuisine',
      emoji: '🤌',
      image: '/images/cookbook/italian.png',
      slug: 'italian',
    },
    {
      name: 'German cuisine',
      emoji: '🥨',
      image: '/images/cookbook/german.png',
      slug: 'german',
    },
    {
      name: 'Japanese cuisine',
      emoji: '🥢',
      image: '/images/cookbook/japanese.png',
      slug: 'japanese',
    },
    {
      name: 'Gourmet cuisine',
      emoji: '✨',
      image: '/images/cookbook/gourmet.png',
      slug: 'gourmet',
    },
    {
      name: 'Indian cuisine',
      emoji: '🍛',
      image: '/images/cookbook/indian.png',
      slug: 'indian',
    },
    {
      name: 'Fusion cuisine',
      emoji: '🍡',
      image: '/images/cookbook/fusion.png',
      slug: 'fusion',
    },
  ];

  async ngOnInit(): Promise<void> {
    try {
      this.mostLiked.set(await this.recipesService.getMostLiked(3));
    } catch (error) {
      console.error(error);
      this.errorMessage.set('Could not load recipes.');
    } finally {
      this.isLoading.set(false);
    }
  }
}
