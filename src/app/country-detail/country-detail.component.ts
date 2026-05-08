import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';

@Component({
  selector: 'app-country-detail',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="country-detail-container">
      <a routerLink="/globe" class="back-btn">&larr; Haritaya Dön</a>
      <h1>{{ countryName }}</h1>
      <p>Bu sayfa ileride özelleştirilecektir.</p>
    </div>
  `,
  styles: [`
    .country-detail-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: calc(100vh - 72px);
      background-color: var(--bg-main);
      color: var(--text-main);
    }
    h1 {
      font-size: 5rem;
      margin-bottom: 1rem;
      font-weight: 800;
      letter-spacing: -2px;
      background: linear-gradient(90deg, var(--primary), var(--secondary));
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    p {
      font-size: 1.2rem;
      color: var(--text-muted);
      font-weight: 500;
    }
    .back-btn {
      position: absolute;
      top: 3rem;
      left: 3rem;
      color: var(--primary);
      text-decoration: none;
      font-size: 1.1rem;
      font-weight: 700;
      transition: all 0.3s;
      padding: 0.8rem 1.5rem;
      background: var(--white);
      border-radius: var(--radius-md);
      box-shadow: var(--shadow-md);
    }
    .back-btn:hover {
      background: var(--primary);
      color: white;
      transform: translateX(-5px);
    }
  `]
})
export class CountryDetailComponent implements OnInit {
  countryName: string = '';

  constructor(private route: ActivatedRoute) { }

  ngOnInit() {
    this.countryName = this.route.snapshot.paramMap.get('name') || 'Bilinmeyen Ülke';
  }
}
