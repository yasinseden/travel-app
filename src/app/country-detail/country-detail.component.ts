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
      height: 100vh;
      background-color: #040d21;
      color: #DAFFFB;
      font-family: 'Inter', sans-serif;
    }
    h1 {
      font-size: 4rem;
      margin-bottom: 1rem;
      background: linear-gradient(90deg, #64CCC5, #a855f7);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    .back-btn {
      position: absolute;
      top: 2rem;
      left: 2rem;
      color: #64CCC5;
      text-decoration: none;
      font-size: 1.2rem;
      transition: color 0.3s;
    }
    .back-btn:hover {
      color: #DAFFFB;
    }
  `]
})
export class CountryDetailComponent implements OnInit {
  countryName: string = '';

  constructor(private route: ActivatedRoute) {}

  ngOnInit() {
    this.countryName = this.route.snapshot.paramMap.get('name') || 'Bilinmeyen Ülke';
  }
}
