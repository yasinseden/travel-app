import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Magazine } from '../models/magazine.model';
import { MagazineService } from '../services/magazine.service';

@Component({
  selector: 'app-magazine-list',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="list-container">
      <div class="glass-header">
        <div class="header-content">
          <h1>My Creative Magazines</h1>
          <button class="new-btn" (click)="createNew()">
            <span class="icon">+</span> New Publication
          </button>
        </div>
      </div>

      <div class="content-wrapper">
        <div class="stats-row">
          <div class="stat-card">
            <span class="stat-val">{{magazines.length}}</span>
            <span class="stat-label">Total Projects</span>
          </div>
          <button class="back-home" (click)="navigate('/')">← Back to Home</button>
        </div>

        <div class="grid">
          <div *ngFor="let mag of magazines" class="mag-card">
            <div class="card-thumb">
               <img [src]="'https://via.placeholder.com/300x400?text=' + mag.title" alt="thumb">
               <div class="overlay">
                  <button class="action-btn view" (click)="view(mag.id)">View Full Screen</button>
               </div>
            </div>
            <div class="card-info">
              <div class="meta">
                <h3>{{mag.title}}</h3>
                <p>{{mag.updatedAt | date:'mediumDate'}}</p>
              </div>
              <button class="edit-btn" (click)="edit(mag.id)">
                Edit Design
              </button>
            </div>
          </div>
          
          <div *ngIf="magazines.length === 0" class="empty-state">
             <div class="empty-icon">🎨</div>
             <h2>No designs found</h2>
             <p>Start your first travel magazine design today!</p>
             <button (click)="createNew()" class="create-first-btn">Get Started</button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .list-container { 
      min-height: 100vh; 
      background: var(--bg-main); 
      color: var(--text-main);
    }
    .glass-header {
      background: var(--glass-bg);
      backdrop-filter: blur(20px);
      padding: 1.5rem 4rem;
      border-bottom: 1px solid var(--glass-border);
      position: sticky;
      top: 0;
      z-index: 100;
    }
    .header-content {
      max-width: 1200px;
      margin: 0 auto;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    h1 { font-size: 2.2rem; font-weight: 800; color: var(--primary-dark); margin: 0; letter-spacing: -1.5px; }
    .new-btn {
      background: linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%);
      color: white;
      border: none;
      padding: 0.8rem 2rem;
      border-radius: var(--radius-md);
      cursor: pointer;
      font-weight: 700;
      transition: all 0.3s ease;
      box-shadow: 0 10px 15px -3px rgba(20, 184, 166, 0.3);
    }
    .new-btn:hover { transform: scale(1.05); filter: brightness(1.1); box-shadow: 0 15px 25px -5px rgba(20, 184, 166, 0.4); }
    
    .content-wrapper { max-width: 1200px; margin: 0 auto; padding: 2rem 4rem; }
    
    .stats-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 3rem; }
    .stat-card { background: var(--white); padding: 1rem 2rem; border-radius: var(--radius-md); border: 1px solid var(--glass-border); display: flex; align-items: center; gap: 1rem; box-shadow: var(--shadow-sm); }
    .stat-val { font-size: 2rem; font-weight: 800; color: var(--primary); }
    .stat-label { color: var(--text-muted); font-size: 0.95rem; font-weight: 600; }
    .back-home { background: var(--white); border: 1.5px solid #e2e8f0; color: var(--text-main); padding: 0.6rem 1.2rem; border-radius: var(--radius-md); cursor: pointer; transition: all 0.3s; font-weight: 600; }
    .back-home:hover { border-color: var(--primary); color: var(--primary); background: var(--bg-main); }
    
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 3rem; }
    .mag-card { 
      background: var(--white); 
      border-radius: var(--radius-lg); 
      overflow: hidden; 
      transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
      border: 1px solid var(--glass-border);
      box-shadow: var(--shadow-md);
    }
    .mag-card:hover { transform: translateY(-12px); border-color: var(--primary-light); box-shadow: 0 30px 60px -12px rgba(20, 184, 166, 0.15); }
    
    .card-thumb { height: 400px; position: relative; overflow: hidden; background: #f1f5f9; }
    .card-thumb img { width: 100%; height: 100%; object-fit: cover; transition: all 0.6s cubic-bezier(0.16, 1, 0.3, 1); }
    .mag-card:hover .card-thumb img { transform: scale(1.1); }
    
    .overlay { 
      position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; 
      opacity: 0; transition: all 0.4s; background: rgba(15, 118, 110, 0.4); 
      backdrop-filter: blur(4px);
    }
    .mag-card:hover .overlay { opacity: 1; }
    .action-btn.view { 
      padding: 1rem 2rem; background: var(--white); color: var(--primary-dark); border-radius: var(--radius-md); font-weight: 700; border: none; cursor: pointer;
      transform: translateY(20px); transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
      box-shadow: var(--shadow-lg);
    }
    .mag-card:hover .action-btn.view { transform: translateY(0); }
    .action-btn.view:hover { background: var(--primary-dark); color: white; }

    .card-info { padding: 1.5rem; display: flex; flex-direction: column; gap: 1.5rem; }
    .meta h3 { margin: 0; font-size: 1.3rem; font-weight: 800; color: var(--text-main); letter-spacing: -0.5px; }
    .meta p { margin: 0.4rem 0 0; font-size: 0.9rem; color: var(--text-muted); font-weight: 500; }
    
    .edit-btn { 
      width: 100%; padding: 0.9rem; background: var(--bg-main); color: var(--primary-dark); border: 1.5px solid var(--primary-light); 
      border-radius: var(--radius-md); cursor: pointer; font-weight: 700; transition: all 0.3s;
    }
    .edit-btn:hover { background: var(--primary); color: white; border-color: var(--primary); }

    .empty-state { grid-column: 1/-1; text-align: center; padding: 6rem; background: var(--white); border-radius: var(--radius-lg); border: 2px dashed var(--primary-light); }
    .empty-icon { font-size: 4rem; margin-bottom: 1.5rem; }
    .create-first-btn { margin-top: 2rem; background: var(--primary); color: white; padding: 1rem 3rem; border-radius: 100px; font-weight: 700; border: none; cursor: pointer; box-shadow: 0 10px 20px rgba(20, 184, 166, 0.3); }
  `]
})
export class MagazineList implements OnInit {
  magazines: Magazine[] = [];
  constructor(private router: Router, private magazineService: MagazineService) {}

  ngOnInit() {
    this.loadMagazines();
  }

  loadMagazines() {
    this.magazines = this.magazineService.getMagazines();
  }

  createNew() { this.router.navigate(['/edit']); }
  edit(id: string) { this.router.navigate(['/edit', id]); }
  view(id: string) { this.router.navigate(['/view', id]); }
  navigate(path: string) { this.router.navigate([path]); }
}
