import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';

interface Magazine {
  id: string;
  name: string;
  pages: string[]; // Base64 image strings
}

@Component({
  selector: 'app-magazine-viewer',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="viewer-container" *ngIf="magazine">
      <div class="top-nav">
        <button class="back-btn" (click)="goBack()">← Back</button>
        <div class="title">{{magazine.name}}</div>
        <div class="page-info">Page {{currentPageIndex + 1}} of {{magazine.pages.length}}</div>
      </div>

      <div class="magazine-board" (click)="nextPage()">
        <div class="page-wrapper" [class.turning]="isTurning">
          <img [src]="magazine.pages[currentPageIndex]" class="page-img shadow-lg" alt="page">
          <div class="page-shadow"></div>
        </div>
      </div>

      <div class="controls">
        <button [disabled]="currentPageIndex === 0" (click)="prevPage(); $event.stopPropagation()">Previous</button>
        <button [disabled]="currentPageIndex === magazine.pages.length - 1" (click)="nextPage(); $event.stopPropagation()">Next</button>
      </div>

      <div class="instructions">Click on page to flip</div>
    </div>
  `,
  styles: [`
    .viewer-container {
      height: 100vh; width: 100vw; background: var(--bg-main); color: var(--text-main); display: flex; flex-direction: column;
      font-family: 'Outfit', sans-serif; overflow: hidden;
    }
    .top-nav {
      height: 72px; background: var(--white); display: flex; align-items: center; padding: 0 4rem;
      justify-content: space-between; border-bottom: 1px solid var(--glass-border);
    }
    .back-btn { background: var(--bg-main); border: 1.5px solid var(--primary-light); color: var(--primary-dark); padding: 0.6rem 1.5rem; border-radius: var(--radius-md); cursor: pointer; font-weight: 700; transition: all 0.3s; }
    .back-btn:hover { background: var(--primary); color: white; transform: translateX(-5px); }
    .title { font-weight: 800; font-size: 1.4rem; color: var(--primary-dark); letter-spacing: -0.5px; }
    .page-info { color: var(--text-muted); font-size: 1rem; font-weight: 600; }

    .magazine-board {
      flex: 1; display: flex; align-items: center; justify-content: center; padding: 3rem;
      perspective: 2000px; cursor: pointer;
    }
    .page-wrapper {
      height: 75vh; aspect-ratio: 1 / 1.414; background: white; position: relative;
      transition: transform 0.6s cubic-bezier(0.16, 1, 0.3, 1);
      box-shadow: 0 40px 80px rgba(15, 118, 110, 0.15);
      border-radius: 8px;
      overflow: hidden;
    }
    .page-img { width: 100%; height: 100%; object-fit: contain; }
    
    .page-shadow {
      position: absolute; top: 0; left: 0; width: 60px; height: 100%;
      background: linear-gradient(to right, rgba(15, 118, 110, 0.1) 0%, transparent 100%);
    }

    .controls {
      height: 100px; display: flex; justify-content: center; gap: 2rem; align-items: center;
      background: var(--white); border-top: 1px solid var(--glass-border);
    }
    .controls button {
      background: var(--bg-main); color: var(--primary-dark); border: 2px solid var(--primary-light); padding: 0.9rem 2.5rem; border-radius: 100px;
      cursor: pointer; font-weight: 700; transition: 0.3s;
    }
    .controls button:hover:not(:disabled) { background: var(--primary); color: white; border-color: var(--primary); transform: translateY(-2px); }
    .controls button:disabled { opacity: 0.3; cursor: not-allowed; }

    .instructions { position: absolute; bottom: 120px; width: 100%; text-align: center; color: var(--text-muted); font-weight: 600; font-size: 0.9rem; pointer-events: none; }
    
    .turning { transform: rotateY(-10deg) translateX(-30px) rotateX(2deg); }
  `]
})
export class MagazineViewer implements OnInit {
  magazine: Magazine | null = null;
  currentPageIndex = 0;
  isTurning = false;

  constructor(private route: ActivatedRoute, private router: Router) {}

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      const data = localStorage.getItem('magazines');
      if (data) {
        this.magazine = JSON.parse(data).find((m: any) => m.id === id) || null;
      }
    }
  }

  nextPage() {
    if (this.magazine && this.currentPageIndex < this.magazine.pages.length - 1) {
      this.animateTurn(() => this.currentPageIndex++);
    }
  }

  prevPage() {
    if (this.currentPageIndex > 0) {
      this.animateTurn(() => this.currentPageIndex--);
    }
  }

  private animateTurn(callback: () => void) {
    this.isTurning = true;
    setTimeout(() => {
      callback();
      this.isTurning = false;
    }, 300);
  }

  goBack() {
    this.router.navigate(['/magazines']);
  }
}
