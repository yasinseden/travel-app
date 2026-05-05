import { CanvasElement } from './canvas-element.model';

export interface Page {
  id: string;
  order: number;
  backgroundColor: string;
  backgroundImage: string | null;
  elements: CanvasElement[];
}