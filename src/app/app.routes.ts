import { Routes } from '@angular/router';
import { AppHome } from './home/home';
import { CanvasEditor } from './canvas-editor/canvas-editor';
import { MagazineViewer } from './magazine-viewer/magazine-viewer';
import { ImgLyCanvasEditor } from './img.ly-canvas-editor/img.ly-canvas-editor';

export const routes: Routes = [
  { path: '', component: AppHome },
  { path: 'img-ly', component: ImgLyCanvasEditor },
  { path: 'edit', component: CanvasEditor },
  { path: 'edit/:id', component: CanvasEditor },
  { path: 'view/:id', component: MagazineViewer },
  { path: 'globe', loadComponent: () => import('./interactive-globe/interactive-globe.component').then(m => m.InteractiveGlobeComponent) },
  { path: 'country/:name', loadComponent: () => import('./country-detail/country-detail.component').then(m => m.CountryDetailComponent) },
  { path: '**', redirectTo: '' }
];
