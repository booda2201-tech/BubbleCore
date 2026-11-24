import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AppLanguage, LanguageService } from '../../core/language';
import { I18n } from '../../core/i18n';
import { SurveyContext } from '../../core/survey-context';

@Component({
  selector: 'app-language-select',
  imports: [],
  templateUrl: './language-select.html',
  styleUrl: './language-select.scss',
})
export class LanguageSelectComponent {
  private readonly language = inject(LanguageService);
  private readonly router = inject(Router);
  private readonly context = inject(SurveyContext);
  protected readonly i18n = inject(I18n);

  protected readonly selected = signal<AppLanguage>(this.language.current());
  protected readonly isExpo = this.context.isExpo;

  protected pick(lang: AppLanguage): void {
    this.selected.set(lang);
    this.language.select(lang);
  }

  protected continue(): void {
    this.language.select(this.selected());
    void this.router.navigate([this.context.paths().welcome]);
  }
}
