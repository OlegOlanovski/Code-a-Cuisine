import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-loading-screen',
  templateUrl: './loading-screen.html',
  styleUrl: './loading-screen.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoadingScreen {
  readonly message = input('Generating recipe');
}
