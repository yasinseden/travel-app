export interface Magazine {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;

  // Editor settings
  settings: {
    width: number;
    height: number;
    unit: string;
    canvasBgColor: string;
  };

  // Fabric.js JSON strings for each page
  pages: string[];

  // First page thumbnail for magazine list cards
  thumbnailUrl?: string;
}