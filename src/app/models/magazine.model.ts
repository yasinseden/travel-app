import { Page } from './page.model';

export interface Magazine {
  id: string;
  title: string;
  pages: Page[];
  createdAt: number;
  updatedAt: number;
}