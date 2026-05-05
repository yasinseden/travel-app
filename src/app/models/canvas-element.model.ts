export interface CanvasElement {
  id: string;
  type: 'image' | 'video' | 'text';
  content: string; // URL for image/video, HTML/text for text elements
  width: number;
  height: number;
  x: number;
  y: number;
  zIndex: number;
  maintainAspectRatio: boolean; // True for image/video, False for text by default
  
  // Specific properties for text elements
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: string | number;
  color?: string;

  // Rotation and Frame
  rotation?: number;
  frame?: string; // 'none', 'solid', 'polaroid', 'elegant'

  // Background and Opacity
  backgroundColor?: string;
  opacity?: number;
}
