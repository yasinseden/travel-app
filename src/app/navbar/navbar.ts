import { Component, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  template: `
    <nav class="temp-navbar">
      <div class="left-section">
        <div class="logo-wrapper" (click)="navigate('/')">
          <img src="assets/logo-transparent-bg.png" alt="Viatio Logo" class="nav-logo">
        </div>
      </div>

      <div class="right-section">
        <!-- Language Switcher Dropdown -->
        <div class="lang-dropdown-container">
          <button class="lang-toggle" (click)="toggleDropdown($event)">
            <span class="fi" [class]="getCurrentFlag()"></span>
            <span class="lang-name">{{ getCurrentLangName() }}</span>
            <svg class="chevron" [class.open]="isDropdownOpen" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"></polyline></svg>
          </button>
          
          <div class="dropdown-menu" *ngIf="isDropdownOpen">
            <button *ngFor="let lang of languages" (click)="changeLang(lang.code)" [class.active]="translate.currentLang === lang.code">
              <span class="fi" [class]="lang.flag"></span>
              {{ lang.name }}
            </button>
          </div>
        </div>

        <button class="btn-auth" (click)="navigate('/login')">
          {{ 'LOGIN.LOG_IN' | translate }} / {{ 'LOGIN.SIGN_UP' | translate }}
        </button>
      </div>
    </nav>
  `,
  styles: [`
    .temp-navbar {
      height: 72px;
      background: var(--glass-bg);
      backdrop-filter: blur(20px);
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 4rem;
      border-bottom: 1px solid var(--glass-border);
      position: sticky;
      top: 0;
      z-index: 1000;
    }
    .logo-wrapper { 
      display: flex;
      align-items: center;
      gap: 1rem;
      cursor: pointer;
      transition: transform 0.3s ease;
    }
    .logo-wrapper:hover { transform: scale(1.02); }
    .nav-logo {
      height: 48px;
      width: auto;
      object-fit: contain;
    }
    
    .right-section { display: flex; align-items: center; gap: 2rem; }

    /* Dropdown Styles */
    .lang-dropdown-container { position: relative; }
    .lang-toggle {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      background: var(--white);
      border: 1.5px solid #e2e8f0;
      padding: 0.6rem 1.2rem;
      border-radius: var(--radius-md);
      cursor: pointer;
      font-weight: 600;
      color: var(--text-main);
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }
    .lang-toggle:hover { 
      border-color: var(--primary);
      box-shadow: 0 4px 12px rgba(20, 184, 166, 0.1);
    }
    .chevron { width: 16px; height: 16px; transition: transform 0.3s; color: var(--text-muted); }
    .chevron.open { transform: rotate(180deg); color: var(--primary); }

    .dropdown-menu {
      position: absolute;
      top: calc(100% + 12px);
      right: 0;
      background: var(--white);
      border: 1px solid #e2e8f0;
      border-radius: var(--radius-md);
      box-shadow: var(--shadow-lg);
      overflow: hidden;
      min-width: 180px;
      animation: fadeInDown 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .dropdown-menu button {
      width: 100%;
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.85rem 1.2rem;
      border: none;
      background: var(--white);
      cursor: pointer;
      font-weight: 500;
      color: var(--text-main);
      text-align: left;
    }
    .dropdown-menu button:hover { background: var(--bg-main); color: var(--primary-dark); }
    .dropdown-menu button.active { background: var(--primary-light); color: var(--primary-dark); font-weight: 700; }

    /* Auth Button */
    .btn-auth {
      background: linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%);
      color: white;
      border: none;
      padding: 0.75rem 1.8rem;
      border-radius: var(--radius-md);
      font-weight: 700;
      cursor: pointer;
      box-shadow: 0 8px 16px -4px rgba(20, 184, 166, 0.3);
    }
    .btn-auth:hover { 
      transform: translateY(-2px); 
      box-shadow: 0 12px 20px -5px rgba(20, 184, 166, 0.4);
    }

    @keyframes fadeInDown {
      from { opacity: 0; transform: translateY(-12px); }
      to { opacity: 1; transform: translateY(0); }
    }
  `]
})
export class Navbar {
  isDropdownOpen = false;
  languages = [
    { code: 'tr', name: 'Türkçe', flag: 'fi-tr' },
    { code: 'en', name: 'English', flag: 'fi-gb' },
    { code: 'de', name: 'Deutsch', flag: 'fi-de' }
  ];

  constructor(public translate: TranslateService, private router: Router) { }

  toggleDropdown(event: Event) {
    event.stopPropagation();
    this.isDropdownOpen = !this.isDropdownOpen;
  }

  @HostListener('document:click')
  closeDropdown() {
    this.isDropdownOpen = false;
  }

  changeLang(lang: string) {
    this.translate.use(lang);
    localStorage.setItem('selectedLang', lang);
    this.isDropdownOpen = false;
  }

  getCurrentLangName() {
    return this.languages.find(l => l.code === this.translate.currentLang)?.name || 'Türkçe';
  }

  getCurrentFlag() {
    return 'fi-' + (this.languages.find(l => l.code === this.translate.currentLang)?.flag?.split('-')[1] || 'tr');
  }

  navigate(path: string) {
    this.router.navigate([path]);
  }
}
