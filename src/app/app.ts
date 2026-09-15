import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { DiscountClient } from './core/discount-client';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  constructor() {
    void inject(DiscountClient).ensureSession();
  }
}
