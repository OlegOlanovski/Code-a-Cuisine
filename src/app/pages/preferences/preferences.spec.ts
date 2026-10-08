import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RecipeDraft } from '../../services/recipe-draft';
import { Preferences } from './preferences';

describe('Preferences', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Preferences],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  it('shows the error popup when there are not enough ingredients', () => {
    const fixture = TestBed.createComponent(Preferences);
    fixture.detectChanges();

    clickGenerate(fixture.nativeElement);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[role="alertdialog"]')).toBeTruthy();
  });

  it('shows the error popup when quantities are insufficient for the portions', () => {
    const recipeDraft = TestBed.inject(RecipeDraft);
    recipeDraft.ingredients.set([
      { name: 'Pasta', quantity: 100, unit: 'gram' },
      { name: 'Tomato', quantity: 100, unit: 'gram' },
    ]);
    recipeDraft.portions.set(5);
    recipeDraft.cookingTime.set('Quick');
    recipeDraft.cuisine.set('Italian');

    const fixture = TestBed.createComponent(Preferences);
    fixture.detectChanges();

    clickGenerate(fixture.nativeElement);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[role="alertdialog"]')).toBeTruthy();
  });

  it('shows the loading screen when the recipe request is valid', () => {
    const recipeDraft = TestBed.inject(RecipeDraft);
    recipeDraft.ingredients.set([
      { name: 'Pasta', quantity: 400, unit: 'gram' },
      { name: 'Tomato', quantity: 400, unit: 'gram' },
    ]);
    recipeDraft.portions.set(5);
    recipeDraft.cookingTime.set('Quick');
    recipeDraft.cuisine.set('Italian');

    const fixture = TestBed.createComponent(Preferences);
    fixture.detectChanges();

    clickGenerate(fixture.nativeElement);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[role="alertdialog"]')).toBeFalsy();
    expect(fixture.nativeElement.querySelector('[role="status"]')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('.preferences-page')).toBeFalsy();
  });
});

function clickGenerate(element: HTMLElement): void {
  const button = element.querySelector<HTMLButtonElement>('.generate-button');
  button?.click();
}
