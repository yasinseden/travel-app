import { Injectable } from '@angular/core';
import { Magazine } from '../models/magazine.model';

@Injectable({ providedIn: 'root' })
export class MagazineService {
  private STORAGE_KEY = 'travel-app-magazines';

  getMagazines(): Magazine[] {
    const data = localStorage.getItem(this.STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  }

  getMagazine(id: string): Magazine | undefined {
    return this.getMagazines().find(m => m.id === id);
  }

  saveMagazine(magazine: Magazine) {
    const magazines = this.getMagazines();
    const index = magazines.findIndex(m => m.id === magazine.id);
    magazine.updatedAt = Date.now();
    if (index > -1) {
      magazines[index] = magazine;
    } else {
      magazines.push(magazine);
    }
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(magazines));
  }

  deleteMagazine(id: string) {
    const magazines = this.getMagazines().filter(m => m.id !== id);
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(magazines));
  }
}