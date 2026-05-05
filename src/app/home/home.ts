import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { MagazineService } from '../services/magazine.service';
import { Magazine } from '../models/magazine.model';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './home.html',
  styleUrls: ['./home.scss']
})
export class AppHome implements OnInit {
  magazines: Magazine[] = [];

  constructor(private magazineService: MagazineService, private router: Router) {}

  ngOnInit() {
    this.loadMagazines();
  }

  loadMagazines() {
    this.magazines = this.magazineService.getMagazines();
  }

  createNew() {
    this.router.navigate(['/edit']);
  }

  editMagazine(id: string) {
    this.router.navigate(['/edit', id]);
  }

  viewMagazine(id: string) {
    this.router.navigate(['/view', id]);
  }

  deleteMagazine(id: string, event: Event) {
    event.stopPropagation();
    if (confirm('Bu e-dergiyi silmek istediğinize emin misiniz?')) {
      this.magazineService.deleteMagazine(id);
      this.loadMagazines();
    }
  }
}
