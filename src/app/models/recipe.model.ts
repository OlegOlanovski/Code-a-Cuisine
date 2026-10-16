export type Cuisine = 'german' | 'italian' | 'indian' | 'japanese' | 'gourmet' | 'fusion';

export type Diet = 'vegetarian' | 'vegan' | 'keto' | 'none';

export type TimeCategory = 'quick' | 'medium' | 'elaborate';

export type IngredientUnit = 'g' | 'piece' | 'l' | 'ml' | 'tbsp' | 'tsp' | '';

export interface RecipeIngredient {
  amount: number | null;
  unit: IngredientUnit;
  name: string;
}

export interface Direction {
  step: number;
  title: string;
  chef: number;
  parallel: boolean;
  waitMinutes: number | null;
  description: string;
}

export interface Nutrition {
  energy: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface Recipe {
  id?: string;
  name: string;
  cuisine: Cuisine;
  diet: Diet;
  timeCategory: TimeCategory;
  cookingTime: number;
  servings: number;
  likes: number;
  yourIngredients: RecipeIngredient[];
  extraIngredients: RecipeIngredient[];
  directions: Direction[];
  nutritionPerServing: Nutrition;
  nutritionTotal: Nutrition;
  createdAt: number;
}
