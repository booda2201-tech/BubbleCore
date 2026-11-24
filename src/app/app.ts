import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { DiscountClient } from './core/discount-client';
import { LanguageService } from './core/language';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  constructor() {
    // Apply stored language (dir/lang) as early as the shell boots.
    inject(LanguageService);
    void inject(DiscountClient).ensureSession();
  }
}
