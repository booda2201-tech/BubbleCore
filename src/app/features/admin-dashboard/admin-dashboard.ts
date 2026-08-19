import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AdminAuth } from '../../core/admin-auth';
import { FeedbackStore } from '../../core/feedback-store';
import { ChoiceId, PRICE_OPTIONS, RECOMMEND_OPTIONS, choiceLabel } from '../../core/models';
import { StarRatingComponent } from '../../shared/star-rating/star-rating';

@Component({
  selector: 'app-admin-dashboard',
  imports: [StarRatingComponent, DecimalPipe, DatePipe],
  templateUrl: './admin-dashboard.html',
  styleUrl: './admin-dashboard.scss',
})
export class AdminDashboardComponent {
  private readonly store = inject(FeedbackStore);
  private readonly auth = inject(AdminAuth);
  private readonly router = inject(Router);

  protected readonly total = this.store.total;
  protected readonly averageRating = this.store.averageRating;
  protected readonly satisfactionRate = this.store.satisfactionRate;
  protected readonly recommendRate = this.store.recommendRate;
  protected readonly priceFairRate = this.store.priceFairRate;
  protected readonly distribution = this.store.distribution;
  protected readonly questionAverages = this.store.questionAverages;
  protected readonly recommendBreakdown = this.store.recommendBreakdown;
  protected readonly priceBreakdown = this.store.priceBreakdown;

  protected readonly averageStars = computed(() => Math.round(this.averageRating()));

  protected readonly search = signal('');
  protected readonly starFilter = signal(0);
  protected readonly starOptions = [0, 5, 4, 3, 2, 1];

  protected readonly rows = computed(() => {
    const term = this.search().trim().toLowerCase();
    const stars = this.starFilter();

    return this.store.entries().filter((entry) => {
      const matchesStars = stars === 0 || entry.rating === stars;
      const matchesTerm =
        !term ||
        entry.name.toLowerCase().includes(term) ||
        entry.phone.includes(term) ||
        entry.suggestion.toLowerCase().includes(term);
      return matchesStars && matchesTerm;
    });
  });

  protected priceLabel(id: ChoiceId | null): string {
    return choiceLabel(PRICE_OPTIONS, id);
  }

  protected recommendLabel(id: ChoiceId | null): string {
    return choiceLabel(RECOMMEND_OPTIONS, id);
  }

  protected priceTone(id: ChoiceId | null): string {
    return PRICE_OPTIONS.find((option) => option.id === id)?.tone ?? 'muted';
  }

  protected recommendTone(id: ChoiceId | null): string {
    return RECOMMEND_OPTIONS.find((option) => option.id === id)?.tone ?? 'muted';
  }

  protected starLabel(stars: number): string {
    return stars === 0 ? 'الكل' : `${stars} نجوم`;
  }

  protected onSearch(event: Event): void {
    this.search.set((event.target as HTMLInputElement).value);
  }

  protected exportCsv(): void {
    // The BOM keeps Arabic readable when the file is opened in Excel.
    const blob = new Blob([`\uFEFF${this.store.toCsv()}`], {
      type: 'text/csv;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `bubblehop-feedback-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  protected remove(id: string): void {
    this.store.remove(id);
  }

  protected seedDemo(): void {
    this.store.seedDemo();
  }

  protected logout(): void {
    this.auth.lock();
    this.router.navigate(['/']);
  }
}
