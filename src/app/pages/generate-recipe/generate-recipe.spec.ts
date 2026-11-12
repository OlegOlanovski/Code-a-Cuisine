import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
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
});
