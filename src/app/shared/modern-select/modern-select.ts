import {
  Component,
  ElementRef,
  HostListener,
  computed,
  inject,
  input,
  model,
  signal,
} from '@angular/core';
import { ChoiceOption } from '../../core/models';

@Component({
  selector: 'app-modern-select',
  imports: [],
  templateUrl: './modern-select.html',
  styleUrl: './modern-select.scss',
})
export class ModernSelectComponent {
  private readonly host = inject(ElementRef<HTMLElement>);

  readonly options = input.required<readonly ChoiceOption[]>();
  readonly placeholder = input('اختر إجابة');
  readonly ariaLabel = input('اختيار');
  /** Bound selection id (or null when empty). */
  readonly value = model<string | null>(null);

  protected readonly open = signal(false);

  protected readonly selected = computed(() => {
    const id = this.value();
    return this.options().find((option) => option.id === id) ?? null;
  });

  protected toggle(): void {
    this.open.update((value) => !value);
  }

  protected choose(id: string): void {
    this.value.set(this.value() === id ? null : id);
    this.open.set(false);
  }

  protected onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      this.open.set(false);
      return;
    }
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.toggle();
    }
  }

  @HostListener('document:click', ['$event'])
  protected onDocumentClick(event: MouseEvent): void {
    if (!this.host.nativeElement.contains(event.target as Node)) {
      this.open.set(false);
    }
  }
}
