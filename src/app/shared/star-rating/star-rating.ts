import { Component, computed, input, model, signal } from '@angular/core';
import { RATING_LABELS } from '../../core/models';

type StarSize = 'sm' | 'md' | 'lg';

@Component({
  selector: 'app-star-rating',
  imports: [],
  templateUrl: './star-rating.html',
  styleUrl: './star-rating.scss',
})
export class StarRatingComponent {
  readonly value = model(0);
  readonly size = input<StarSize>('md');
  readonly readOnly = input(false);
  readonly showHint = input(false);
  readonly ariaLabel = input('التقييم');

  protected readonly stars = [1, 2, 3, 4, 5];
  protected readonly hovered = signal(0);

  protected readonly active = computed(() => this.hovered() || this.value());
  protected readonly hint = computed(() => RATING_LABELS[this.active()] ?? RATING_LABELS[0]);

  protected select(star: number): void {
    if (this.readOnly()) return;
    // Tapping the current rating again clears it, which makes a mis-tap recoverable.
    this.value.set(this.value() === star ? 0 : star);
  }

  protected preview(star: number): void {
    if (!this.readOnly()) this.hovered.set(star);
  }

  protected clearPreview(): void {
    this.hovered.set(0);
  }

  protected onKeydown(event: KeyboardEvent): void {
    if (this.readOnly()) return;

    const rtl = document.documentElement.dir === 'rtl';
    const forward = rtl ? ['ArrowLeft', 'ArrowUp'] : ['ArrowRight', 'ArrowUp'];
    const backward = rtl ? ['ArrowRight', 'ArrowDown'] : ['ArrowLeft', 'ArrowDown'];

    let next: number | null = null;
    if (forward.includes(event.key)) next = Math.min(5, this.value() + 1);
    else if (backward.includes(event.key)) next = Math.max(0, this.value() - 1);
    else if (event.key === 'Home') next = 1;
    else if (event.key === 'End') next = 5;

    if (next !== null) {
      event.preventDefault();
      this.value.set(next);
    }
  }
}
