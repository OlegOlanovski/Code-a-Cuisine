import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { NEVER, of } from 'rxjs';
import { Recipe } from '../../models/recipe.model';
import { RecipeDraft } from '../../services/recipe-draft';
import { QuotaStatus, RecipeGenerator } from '../../services/recipe-generator';
import { Preferences } from './preferences';

const availableQuota: QuotaStatus = {
  date: '2026-11-12',
  perIpLimit: 9,
  systemLimit: 12,
  ipUsed: 0,
  totalUsed: 0,
  remainingRecipes: 9,
  canGenerate: true,
  message: '9 recipes are available today for this network.',
};

const recipeGeneratorMock = {
  results: signal<Recipe[]>([]),
  quotaStatus: signal<QuotaStatus | null>(null),
  getQuotaStatus: vi.fn(() => of(availableQuota)),
  generate: vi.fn(() => NEVER),
};

describe('Preferences', () => {
  beforeEach(async () => {
    recipeGeneratorMock.results.set([]);
    recipeGeneratorMock.quotaStatus.set(null);
    recipeGeneratorMock.getQuotaStatus.mockReset().mockReturnValue(of(availableQuota));
    recipeGeneratorMock.generate.mockReset().mockReturnValue(NEVER);

    await TestBed.configureTestingModule({
      imports: [Preferences],
      providers: [provideRouter([]), { provide: RecipeGenerator, useValue: recipeGeneratorMock }],
    }).compileComponents();
  });

  it('shows the remaining daily recipe quota', () => {
    const fixture = TestBed.createComponent(Preferences);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.quota-summary')?.textContent).toContain(
      'Recipes left today: 9',
    );
    expect(fixture.nativeElement.querySelector('.preferences-main .quota-summary')).toBeNull();
  });

  it('does not generate when the daily quota is exhausted', () => {
    const exhaustedQuota: QuotaStatus = {
      ...availableQuota,
      ipUsed: 9,
      remainingRecipes: 0,
      canGenerate: false,
      message:
        'You have reached your daily limit of 9 recipes for this network. Please try again tomorrow.',
    };
    recipeGeneratorMock.getQuotaStatus.mockReturnValue(of(exhaustedQuota));

    const recipeDraft = TestBed.inject(RecipeDraft);
    setValidDraft(recipeDraft);

    const fixture = TestBed.createComponent(Preferences);
    fixture.detectChanges();
    clickGenerate(fixture.nativeElement);
    fixture.detectChanges();

    expect(recipeGeneratorMock.generate).not.toHaveBeenCalled();
    expect(
      fixture.nativeElement.querySelector('#generation-error-description')?.textContent,
    ).toContain('daily limit of 9 recipes');
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
    setValidDraft(recipeDraft);

    const fixture = TestBed.createComponent(Preferences);
    fixture.detectChanges();

    clickGenerate(fixture.nativeElement);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[role="alertdialog"]')).toBeFalsy();
    expect(fixture.nativeElement.querySelector('[role="status"]')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('.preferences-page')).toBeFalsy();
  });
});

/**
 * Clicks the recipe generation button in a test fixture.
 *
 * @param element - Root element of the rendered preferences component.
 */
function clickGenerate(element: HTMLElement): void {
  const button = element.querySelector<HTMLButtonElement>('.generate-button');
  button?.click();
}

/** Populates a draft that passes the recipe request validation. */
function setValidDraft(recipeDraft: RecipeDraft): void {
  recipeDraft.ingredients.set([
    { name: 'Pasta', quantity: 400, unit: 'gram' },
    { name: 'Tomato', quantity: 400, unit: 'gram' },
  ]);
  recipeDraft.portions.set(5);
  recipeDraft.cookingTime.set('Quick');
  recipeDraft.cuisine.set('Italian');
}
