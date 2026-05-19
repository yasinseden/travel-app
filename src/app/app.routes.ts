import { Routes } from '@angular/router';
import { AppHome } from './home/home';
import { CreativeEditor } from './creative-editor/creative-editor';
import { MagazineList } from './magazine-list/magazine-list';
import { Login } from './login/login';

export const routes: Routes = [
  { path: 'login', component: Login },
  { path: '', component: AppHome },
  { path: 'magazines', component: MagazineList },

  { path: 'edit', component: CreativeEditor },
  { path: 'edit/:id', component: CreativeEditor },
  { path: 'globe', loadComponent: () => import('./interactive-globe/interactive-globe.component').then(m => m.InteractiveGlobeComponent) },
  { path: 'country/:name', loadComponent: () => import('./country-detail/country-detail.component').then(m => m.CountryDetailComponent) },
  { path: '**', redirectTo: '' }
];
