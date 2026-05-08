import { Component, signal } from '@angular/core';
import { RouterOutlet, Router } from '@angular/router';
import { Navbar } from './navbar/navbar';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, Navbar],
  template: `
    @if (router.url !== '/login') {
      <app-navbar></app-navbar>
    }
    <router-outlet></router-outlet>
  `,
  styleUrl: './app.scss'
})
export class App {
  constructor(public router: Router) {}
  protected readonly title = signal('travel-app');
}
