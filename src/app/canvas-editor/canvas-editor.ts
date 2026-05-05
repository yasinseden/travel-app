import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CanvasElement } from '../models/canvas-element.model';
import { CanvasItem } from '../canvas-item/canvas-item';
import { FormsModule } from '@angular/forms';
import { Page } from '../models/page.model';
import { Magazine } from '../models/magazine.model';
import { MagazineService } from '../services/magazine.service';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'app-canvas-editor',
  standalone: true,
  imports: [CommonModule, CanvasItem, FormsModule],
  templateUrl: './canvas-editor.html',
  styleUrls: ['./canvas-editor.scss'],
})
export class CanvasEditor implements OnInit {
  magazine!: Magazine;
  activePageId: string | null = null;
  selectedElementId: string | null = null;

  boardWidth = 0;
  boardHeight = 0;

  constructor(
    private magazineService: MagazineService,
    private route: ActivatedRoute,
    private router: Router
  ) { }

  ngOnInit() {
    this.loadMagazine();
    this.updateBoardDimensions();
  }

  @HostListener('window:resize')
  updateBoardDimensions() {
    this.boardWidth = window.innerWidth;
    this.boardHeight = window.innerHeight;
  }

  loadMagazine() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      const existing = this.magazineService.getMagazine(id);
      if (existing) {
        this.magazine = existing;
      } else {
        this.initializeNewMagazine();
      }
    } else {
      this.initializeNewMagazine();
    }

    if (this.magazine.pages.length === 0) {
      this.addNewPage();
    } else {
      this.activePageId = this.magazine.pages[0].id;
    }
  }

  initializeNewMagazine() {
    this.magazine = {
      id: this.generateId(),
      title: 'Yeni E-Dergi',
      pages: [],
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
  }

  saveMagazine() {
    this.magazineService.saveMagazine(this.magazine);
  }

  get pages(): Page[] {
    return this.magazine?.pages || [];
  }

  get activePage(): Page | undefined {
    return this.pages.find(p => p.id === this.activePageId);
  }

  get elements(): CanvasElement[] {
    return this.activePage ? this.activePage.elements : [];
  }

  get pageBackgroundColor(): string {
    return this.activePage?.backgroundColor || '#f8f9fa';
  }

  set pageBackgroundColor(color: string) {
    if (this.activePage) {
      this.activePage.backgroundColor = color;
    }
  }

  get pageBackgroundImage(): string | null {
    return this.activePage?.backgroundImage || null;
  }

  set pageBackgroundImage(image: string | null) {
    if (this.activePage) {
      this.activePage.backgroundImage = image;
    }
  }

  addNewPage() {
    const newPage: Page = {
      id: this.generateId(),
      order: this.pages.length,
      backgroundColor: '#f8f9fa',
      backgroundImage: null,
      elements: []
    };
    this.magazine.pages.push(newPage);
    this.activePageId = newPage.id;
  }

  selectPage(id: string) {
    this.activePageId = id;
    this.selectedElementId = null;
  }

  clearCurrentPage() {
    if (this.activePage) {
      if(confirm('Sayfadaki tüm öğeleri silmek istediğinize emin misiniz?')) {
        this.activePage.elements = [];
        this.selectedElementId = null;
      }
    }
  }

  goBack() {
    this.router.navigate(['/']);
  }

  previewMagazine() {
    this.saveMagazine();
    this.router.navigate(['/view', this.magazine.id]);
  }

  showImageDialog = false;
  imageUrlInput = '';
  imageDialogPosition = { x: 0, y: 0 };
  private imageResolve: ((url: string | null) => void) | null = null;

  async requestImageSource(event?: MouseEvent): Promise<string | null> {
    if (event) {
      const target = (event.currentTarget || event.target) as HTMLElement;
      const rect = target.getBoundingClientRect();
      this.imageDialogPosition = {
        x: rect.left,
        y: rect.bottom + 8
      };
    } else {
      this.imageDialogPosition = { x: window.innerWidth / 2 - 150, y: window.innerHeight / 2 - 100 };
    }
    
    this.imageUrlInput = '';
    this.showImageDialog = true;
    return new Promise(resolve => {
      this.imageResolve = resolve;
    });
  }

  closeImageDialog() {
    this.showImageDialog = false;
    if (this.imageResolve) {
      this.imageResolve(null);
      this.imageResolve = null;
    }
  }

  onDeviceUpload() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e: any) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event: any) => {
          this.showImageDialog = false;
          if (this.imageResolve) {
            this.imageResolve(event.target.result);
            this.imageResolve = null;
          }
        };
        reader.readAsDataURL(file);
      }
    };
    input.click();
  }

  onUrlSubmit() {
    if (this.imageUrlInput && this.imageUrlInput.trim().length > 0) {
      this.showImageDialog = false;
      if (this.imageResolve) {
        this.imageResolve(this.imageUrlInput.trim());
        this.imageResolve = null;
      }
    }
  }

  async setBackgroundImage(event?: MouseEvent) {
    const source = await this.requestImageSource(event);
    if (source) {
      this.pageBackgroundImage = source;
    }
  }

  removeBackgroundImage() {
    this.pageBackgroundImage = null;
  }

  generateId() {
    return Math.random().toString(36).substring(2, 9);
  }

  async addElement(type: 'image' | 'video' | 'text', event?: MouseEvent) {
    if (!this.activePage) return;

    let content = '';
    let width = 300;
    let height = 200;
    let maintainAspectRatio = true;

    if (type === 'image') {
      const source = await this.requestImageSource(event);
      if (!source) return;
      content = source;
      
      try {
        const img = new Image();
        img.src = source;
        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = reject;
        });
        
        const imgWidth = img.naturalWidth;
        const imgHeight = img.naturalHeight;
        const maxWidth = 500;
        const maxHeight = 500;
        
        if (imgWidth > maxWidth || imgHeight > maxHeight) {
          const ratio = Math.min(maxWidth / imgWidth, maxHeight / imgHeight);
          width = imgWidth * ratio;
          height = imgHeight * ratio;
        } else {
          width = imgWidth;
          height = imgHeight;
        }
      } catch (e) {
        console.warn('Could not load image dimensions, using defaults.', e);
        width = 300;
        height = 200;
      }
    } else if (type === 'video') {
      const url = window.prompt('Lütfen eklenecek videonun URL\'sini giriniz:', 'http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4');
      if (!url) return;
      content = url;
    } else if (type === 'text') {
      content = 'Yeni Metin...';
      maintainAspectRatio = false;
      width = 250;
      height = 60;
    }

    const padding = 80;
    const newElement: CanvasElement = {
      id: this.generateId(),
      type,
      content,
      width,
      height,
      x: padding,
      y: padding + 60,
      zIndex: this.activePage.elements.length + 1,
      maintainAspectRatio,
      fontFamily: 'Playfair Display',
      fontSize: 24,
      fontWeight: 'normal',
      color: '#333333',
      rotation: 0,
      frame: 'none',
      backgroundColor: 'transparent',
      opacity: 1
    };

    this.activePage.elements.push(newElement);
    this.selectElement(newElement.id);
  }

  selectElement(id: string) {
    this.selectedElementId = id;
  }

  @HostListener('document:mousedown', ['$event'])
  onDocumentClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (!target.closest('.canvas-item-wrapper') && !target.closest('.toolbar') && !target.closest('.properties-panel')) {
      this.selectedElementId = null;
    }
  }

  async updateElement(updatedElement: CanvasElement) {
    if (!this.activePage) return;
    const index = this.activePage.elements.findIndex(e => e.id === updatedElement.id);
    if (index > -1) {
      this.activePage.elements[index] = updatedElement;
    }
  }

  async removeElement(id: string) {
    if (!this.activePage) return;
    this.activePage.elements = this.activePage.elements.filter(e => e.id !== id);
    if (this.selectedElementId === id) {
      this.selectedElementId = null;
    }
  }

  get selectedElement() {
    return this.activePage?.elements.find(e => e.id === this.selectedElementId);
  }
}
