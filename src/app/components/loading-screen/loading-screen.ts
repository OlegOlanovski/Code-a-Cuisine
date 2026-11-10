import { ChangeDetectionStrategy, Component, input, signal } from '@angular/core';

@Component({
  selector: 'app-loading-screen',
  templateUrl: './loading-screen.html',
  styleUrl: './loading-screen.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoadingScreen {
  readonly message = input('Generating recipe');
  protected readonly videoFailed = signal(false);

  /** Switches from the loading video to the fallback animation. */
  protected useFallbackAnimation(): void {
    this.videoFailed.set(true);
  }
}
