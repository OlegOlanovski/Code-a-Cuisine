import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RecipeDraft } from '../../services/recipe-draft';
import { GenerateRecipe } from './generate-recipe';

describe('GenerateRecipe', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GenerateRecipe],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  it('opens all unit options below the measurement button', () => {
    const fixture = TestBed.createComponent(GenerateRecipe);
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    const unitButton = element.querySelector<HTMLButtonElement>('.measurement-button');
    unitButton?.click();
    fixture.detectChanges();

    const menu = element.querySelector('.measurement-menu');

    expect(menu).toBeTruthy();
    expect(menu?.querySelectorAll('[role="option"]')).toHaveLength(3);
  });

  it('rejects text that is not a known ingredient', () => {
    const fixture = TestBed.createComponent(GenerateRecipe);
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    const component = fixture.componentInstance as unknown as {
      ingredientName: string;
      ingredientError: string;
      quantity: number | null;
      addIngredient: () => void;
    };

    component.ingredientName = 'asdfgh';
    component.quantity = 100;
    component.addIngredient();
    fixture.detectChanges();

    expect(component.ingredientError).toContain('Please choose a valid ingredient');
    expect(element.querySelectorAll('.ingredients-card li')).toHaveLength(0);
  });

  it('accepts a known ingredient and uses its catalogue spelling', () => {
    const fixture = TestBed.createComponent(GenerateRecipe);
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    const component = fixture.componentInstance as unknown as {
      ingredientName: string;
      quantity: number | null;
      addIngredient: () => void;
    };

    component.ingredientName = 'pasta';
    component.quantity = 100;
    component.addIngredient();
    fixture.detectChanges();

    expect(element.querySelector('.ingredient-list-name')?.textContent?.trim()).toBe('Pasta');
    expect(element.querySelector('.field-error')).toBeNull();
  });

  it('shows the next step only after two ingredients are added', () => {
    const recipeDraft = TestBed.inject(RecipeDraft);
    recipeDraft.ingredients.set([{ name: 'Pasta', quantity: 100, unit: 'gram' }]);

    const fixture = TestBed.createComponent(GenerateRecipe);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.next-button')).toBeNull();

    recipeDraft.ingredients.update((ingredients) => [
      ...ingredients,
      { name: 'Tomato', quantity: 100, unit: 'gram' },
    ]);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.next-button')).toBeTruthy();
  });
});
