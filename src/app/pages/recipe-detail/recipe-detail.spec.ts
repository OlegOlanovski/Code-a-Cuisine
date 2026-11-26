import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RecipeDetail } from './recipe-detail';

describe('RecipeDetail', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RecipeDetail],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  it('formats legacy ingredient amounts stored as numeric strings', () => {
    const fixture = TestBed.createComponent(RecipeDetail);
    const component = fixture.componentInstance as unknown as {
      formatIngredientAmount: (amount: number | string | null, unit: string) => string;
    };

    expect(component.formatIngredientAmount('100', 'g')).toBe('100g');
    expect(component.formatIngredientAmount('1.5', 'piece')).toBe('1.5 piece');
  });
});
