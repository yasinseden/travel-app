import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { MagazineService } from '../services/magazine.service';
import { Magazine } from '../models/magazine.model';
import { CanvasItem } from '../canvas-item/canvas-item';
import { Page } from '../models/page.model';

@Component({
  selector: 'app-magazine-viewer',
  standalone: true,
  imports: [CommonModule, CanvasItem],
  templateUrl: './magazine-viewer.html',
  styleUrls: ['./magazine-viewer.scss']
})
export class MagazineViewer implements OnInit {
  magazine: Magazine | null = null;
  currentPageIndex = 0;
  
  boardWidth = 0;
  boardHeight = 0;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private magazineService: MagazineService
  ) {}

  ngOnInit() {
    this.updateDimensions();
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.magazine = this.magazineService.getMagazine(id) || null;
    }
  }

  @HostListener('window:resize')
  updateDimensions() {
    this.boardWidth = window.innerWidth;
    this.boardHeight = window.innerHeight;
  }

  get activePage(): Page | undefined {
    return this.magazine?.pages[this.currentPageIndex];
  }

  trackById(index: number, page: Page) {
    return page.id;
  }

  nextPage() {
    if (this.magazine && this.currentPageIndex < this.magazine.pages.length - 1) {
      this.currentPageIndex++;
    }
  }

  prevPage() {
    if (this.currentPageIndex > 0) {
      this.currentPageIndex--;
    }
  }

  goBack() {
    this.router.navigate(['/']);
  }
}
