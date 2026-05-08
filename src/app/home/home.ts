import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  template: `
    <div class="home-container">
      <div class="hero-section">
        <h1 class="title">{{ 'HOME.TITLE' | translate }}</h1>
        <p class="subtitle">{{ 'HOME.SUBTITLE' | translate }}</p>
        
        <div class="button-group main-actions">
          <button (click)="navigate('/globe')" class="btn globe-btn">
            <span class="icon">🌍</span> {{ 'HOME.EXPLORE_GLOBE' | translate }}
          </button>
          
          <button (click)="navigate('/magazines')" class="btn magazine-btn">
            <span class="icon">📖</span> {{ 'HOME.MAGAZINE_PROJECTS' | translate }}
          </button>
        </div>

        <div class="divider"><span>{{ 'LOGIN.OR_CONTINUE' | translate }}</span></div>

        <div class="button-group auth-actions">
          <button (click)="navigate('/login')" class="btn login-btn">
            {{ 'LOGIN.LOG_IN' | translate }}
          </button>
          <button (click)="navigate('/login')" class="btn signup-btn">
            {{ 'LOGIN.SIGN_UP' | translate }}
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .home-container {
      height: calc(100vh - 72px);
      display: flex;
      align-items: center;
      justify-content: center;
      background: radial-gradient(circle at top right, var(--primary-light), transparent),
                  radial-gradient(circle at bottom left, #dcfce7, transparent);
      padding: 2rem;
    }
    .hero-section {
      max-width: 900px;
      text-align: center;
      animation: fadeIn 1s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .title {
      font-size: 5rem;
      font-weight: 800;
      color: var(--primary-dark);
      margin-bottom: 1.5rem;
      letter-spacing: -3px;
      line-height: 1;
    }
    .subtitle {
      font-size: 1.5rem;
      color: var(--text-muted);
      margin-bottom: 4rem;
      font-weight: 400;
    }
    .button-group {
      display: flex;
      gap: 1.5rem;
      justify-content: center;
      flex-wrap: wrap;
    }
    .btn {
      padding: 1.2rem 3rem;
      border-radius: var(--radius-lg);
      font-size: 1.2rem;
      font-weight: 700;
      display: flex;
      align-items: center;
      gap: 1rem;
      box-shadow: var(--shadow-lg);
    }
    .globe-btn { background: var(--primary); color: white; }
    .magazine-btn { background: var(--secondary); color: white; }
    
    .btn:hover { 
      transform: translateY(-8px) scale(1.02); 
      filter: brightness(1.1);
      box-shadow: 0 20px 40px rgba(20, 184, 166, 0.2); 
    }
    
    .divider {
      margin: 3rem 0;
      display: flex;
      align-items: center;
      color: var(--text-muted);
      font-size: 0.9rem;
      letter-spacing: 2px;
      text-transform: uppercase;
    }
    .divider::before, .divider::after {
      content: '';
      flex: 1;
      height: 1px;
      background: rgba(15, 118, 110, 0.1);
    }
    .divider span { padding: 0 2rem; }

    .auth-actions { gap: 1.5rem; }
    .login-btn { 
      background: transparent; 
      border: 2px solid var(--primary); 
      color: var(--primary); 
      padding: 1rem 3rem;
    }
    .signup-btn { 
      background: var(--white); 
      border: 1px solid #e2e8f0;
      color: var(--text-main); 
      padding: 1rem 3rem;
    }
    
    @keyframes fadeIn { from { opacity: 0; transform: translateY(40px); } to { opacity: 1; transform: translateY(0); } }
  `]
})
export class AppHome {
  constructor(private router: Router) {}
  navigate(path: string) { this.router.navigate([path]); }
}
