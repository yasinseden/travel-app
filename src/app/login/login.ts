import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, TranslateModule],
  templateUrl: './login.html',
  styleUrls: ['./login.scss']
})
export class Login implements OnInit, OnDestroy {
  images: string[] = [
    'https://explore-live.s3.eu-west-1.amazonaws.com/medialibraries/explore/explore-media/destinations/asia/japan/japan-thumb.jpg?ext=.jpg',
    'https://media.digitalnomads.world/wp-content/uploads/2021/01/20120709/bali-for-digital-nomads.jpg',
    'https://static.vecteezy.com/system/resources/thumbnails/045/859/618/small/beautiful-tropical-maldives-island-scene-blue-sea-blue-sky-holiday-vacation-vertical-background-wooden-pathway-pier-amazing-summer-travel-concept-ocean-bay-palm-trees-sandy-beach-exotic-nature-photo.jpg',
    'https://i.natgeofe.com/n/add5cc43-eda9-4feb-b53f-e11ddf2c4665/gettyimages-1175707040_web.jpg',
    'https://i0.wp.com/www.touristjapan.com/wp-content/uploads/2023/04/fujiyoshida-view-scaled-e1680427764989.jpg?resize=2000%2C800&ssl=1',
    'https://images.squarespace-cdn.com/content/v1/64ba44348b6a05559a816bc1/1690282971608-B4BD48EE7DOGJDWKOL52/A+Guide+to+Travel+Photography-152.jpg',
    'https://static.vecteezy.com/system/resources/thumbnails/008/009/837/small/outdoor-tourism-landscape-luxurious-beach-resort-with-swimming-pool-and-beach-chairs-or-loungers-umbrellas-with-palm-trees-and-blue-sky-sea-horizon-summer-island-relax-travel-and-idyllic-vacation-photo.jpg'
  ];

  quotes: string[] = [];
  currentSlideIndex = 0;
  currentSlide = this.images[0];
  slideInterval: any;
  showPassword = false;

  loginData = {
    email: '',
    password: '',
    rememberMe: true
  };

  constructor(
    private router: Router,
    public translate: TranslateService,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit() {
    this.loadQuotes();
    this.startSlideshow();

    // Update quotes when language changes
    this.translate.onLangChange.subscribe(() => {
      this.loadQuotes();
    });
  }

  loadQuotes() {
    this.translate.get('QUOTES').subscribe((res: string[]) => {
      this.quotes = res;
      this.cdr.detectChanges();
    });
  }

  ngOnDestroy() {
    if (this.slideInterval) {
      clearInterval(this.slideInterval);
    }
  }

  startSlideshow() {
    this.slideInterval = setInterval(() => {
      this.currentSlideIndex = (this.currentSlideIndex + 1) % this.images.length;
      this.currentSlide = this.images[this.currentSlideIndex];
      this.cdr.detectChanges();
    }, 3500);
  }

  togglePassword() {
    this.showPassword = !this.showPassword;
  }

  onLogin() {
    console.log('Login attempt:', this.loginData);
    this.router.navigate(['/home']);
  }
}
