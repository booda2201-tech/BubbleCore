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
  /** Compact trigger for dense tables / toolbars. */
  readonly size = input<'default' | 'compact'>('default');
  /** When false, re-selecting the active option keeps it instead of clearing. */
  readonly clearable = input(true);
  readonly disabled = input(false);
  /** Bound selection id (or null when empty). */
  readonly value = model<string | null>(null);

  protected readonly open = signal(false);
  protected readonly dropUp = signal(false);

  protected readonly selected = computed(() => {
    const id = this.value();
    return this.options().find((option) => option.id === id) ?? null;
  });

  protected toggle(): void {
    if (this.disabled()) return;
    if (this.open()) {
      this.closeMenu();
      return;
    }
    this.open.set(true);
    requestAnimationFrame(() => this.syncDropDirection());
  }

  protected choose(id: string): void {
    if (this.disabled()) return;
    if (this.clearable() && this.value() === id) {
      this.value.set(null);
    } else {
      this.value.set(id);
    }
    this.closeMenu();
  }

  protected onKeydown(event: KeyboardEvent): void {
    if (this.disabled()) return;
    if (event.key === 'Escape') {
      this.closeMenu();
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
      this.closeMenu();
    }
  }

  @HostListener('window:resize')
  @HostListener('window:scroll')
  protected onViewportChange(): void {
    if (this.open()) this.syncDropDirection();
  }

  private closeMenu(): void {
    this.open.set(false);
    this.dropUp.set(false);
  }

  private syncDropDirection(): void {
    const trigger = this.host.nativeElement.querySelector('.ms-trigger') as HTMLElement | null;
    const menu = this.host.nativeElement.querySelector('.ms-menu') as HTMLElement | null;
    if (!trigger) return;

    const rect = trigger.getBoundingClientRect();
    const menuHeight = menu?.offsetHeight || this.options().length * 42 + 24;
    const spaceBelow = window.innerHeight - rect.bottom - 8;
    const spaceAbove = rect.top - 8;
    this.dropUp.set(spaceBelow < menuHeight && spaceAbove > spaceBelow);
  }
}
