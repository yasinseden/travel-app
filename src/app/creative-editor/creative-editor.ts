import { Component, OnInit, AfterViewInit, ElementRef, ViewChild, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import * as fabric from 'fabric';

type ActiveTool = 'settings' | 'templates' | 'text' | 'photos' | 'draw' | 'icons' | 'shapes' | 'layers' | null;

@Component({
  selector: 'app-creative-editor',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './creative-editor.html',
  styleUrls: ['./creative-editor.scss'],
})
export class CreativeEditor implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('canvasContainer') canvasContainer!: ElementRef<HTMLDivElement>;
  @ViewChild('fabricCanvas') fabricCanvas!: ElementRef<HTMLCanvasElement>;

  canvas!: fabric.Canvas;
  activeTool: ActiveTool = 'settings';

  documentName = 'Untitled Design';
  docWidth = 800;
  docHeight = 600;
  docUnit = 'px';
  canvasBgColor = '#ffffff';
  currentZoom = 1;

  pages: string[] = [];
  currentPageIndex = 0;

  activeObjectType: string | null = null;
  selectedObjectId: string | null = null;
  activeObject: any = null;

  draggedLayerIndex: number | null = null;
  dragOverLayerIndex: number | null = null;
  private panListeners: (() => void)[] = [];

  showFloatingToolbar = false;

  textProps = { fontFamily: 'Inter', fontSize: 40, fill: '#000000', fontWeight: 'normal', fontStyle: 'normal', underline: false, textAlign: 'left' };
  shapeProps: any = { fill: '#14b8a6', stroke: '#000000', strokeWidth: 0, rx: 0, ry: 0 };
  imageProps = { borderRadius: 0, stroke: '#000000', strokeWidth: 0, shadow: false, frame: 'none', maskOffsetX: 0, maskOffsetY: 0, maskScale: 1 };
  commonProps = { opacity: 1, hasShadow: false };

  imageUrlInput = '';
  canvasLayers: any[] = [];
  isDrawingMode = false;
  isTextOnPathMode = false;
  drawingProps = {
    width: 5,
    color: '#14b8a6'
  };

  isPolygonMode = false;
  polygonPoints: { x: number, y: number }[] = [];
  tempLines: fabric.Line[] = [];
  activeLine: fabric.Line | null = null;
  tempPointMarkers: fabric.Circle[] = [];

  constructor(private router: Router) { }

  ngOnInit() {
    this.pages.push(''); // Initial empty page
  }

  private preventDefaultZoom = (e: WheelEvent) => {
    if (e.ctrlKey) {
      e.preventDefault();
    }
  };

  ngAfterViewInit() {
    this.initCanvas();
    this.setupPanning();
    window.addEventListener('wheel', this.preventDefaultZoom, { passive: false });
  }

  ngOnDestroy() {
    if (this.canvas) {
      this.canvas.dispose();
    }
    this.panListeners.forEach(fn => fn());
    window.removeEventListener('wheel', this.preventDefaultZoom);
  }

  setupPanning() {
    const container = this.canvasContainer.nativeElement;
    let isDown = false;
    let startX: number;
    let startY: number;
    let scrollLeft: number;
    let scrollTop: number;

    const startDrag = (e: MouseEvent) => {
      isDown = true;
      container.style.cursor = 'grabbing';
      startX = e.clientX;
      startY = e.clientY;
      scrollLeft = container.scrollLeft;
      scrollTop = container.scrollTop;
    };

    const onMouseDown = (e: MouseEvent) => {
      if (e.button === 1 || (e.button === 0 && e.target === container)) {
        startDrag(e);
        e.preventDefault();
      }
    };

    const stopDrag = () => {
      isDown = false;
      container.style.cursor = '';
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!isDown) return;
      e.preventDefault();
      const walkX = e.clientX - startX;
      const walkY = e.clientY - startY;
      container.scrollLeft = scrollLeft - walkX;
      container.scrollTop = scrollTop - walkY;
    };

    container.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mouseup', stopDrag);
    window.addEventListener('mousemove', onMouseMove);

    this.panListeners.push(() => {
      container.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mouseup', stopDrag);
      window.removeEventListener('mousemove', onMouseMove);
    });

    this.canvas.on('mouse:down', (opt: any) => {
      if (opt.e.button === 1) {
        startDrag(opt.e as MouseEvent);
        opt.e.preventDefault();
      }
    });
  }

  initCanvas() {
    if (this.canvas) {
      this.canvas.dispose();
    }

    // In Fabric v6, it's safer to pass the native element and clean up internal state if HMR occurs
    const canvasEl = this.fabricCanvas.nativeElement;
    // Clear any previous fabric attributes to force a clean init
    canvasEl.removeAttribute('data-fabric');

    this.canvas = new fabric.Canvas(canvasEl, {
      width: this.docWidth,
      height: this.docHeight,
      backgroundColor: this.canvasBgColor,
      preserveObjectStacking: true,
    });

    this.setupCanvasEvents();
    this.centerCanvas();
  }

  setupCanvasEvents() {
    this.canvas.on('selection:created', (e) => this.onObjectSelected(e.selected?.[0]));
    this.canvas.on('selection:updated', (e) => this.onObjectSelected(e.selected?.[0]));
    this.canvas.on('selection:cleared', () => this.onObjectCleared());
    this.canvas.on('object:added', () => this.updateLayers());
    this.canvas.on('object:removed', () => this.updateLayers());

    this.canvas.on('path:created', (opt: any) => {
      if (this.isTextOnPathMode) {
        const path = opt.path;
        path.set({ visible: false, selectable: false, evented: false });

        const textStr = 'Your text along the path...';
        const fontSize = 32;
        const fontFamily = 'Pacifico';

        // 1. Estimate Path Length
        const pathData = path.path;
        let totalPathLength = 0;
        for (let i = 1; i < pathData.length; i++) {
          const p1 = pathData[i - 1];
          const p2 = pathData[i];
          // Simple linear distance between path segments
          const dx = (p2[1] || 0) - (p1[1] || 0);
          const dy = (p2[2] || 0) - (p1[2] || 0);
          totalPathLength += Math.sqrt(dx * dx + dy * dy);
        }

        // 2. Measure Text Width (without extra spacing)
        const tempText = new fabric.Text(textStr, { fontSize, fontFamily });
        const textWidth = tempText.width;

        // 3. Calculate dynamic charSpacing (in Fabric units: 1/1000 of fontSize)
        let dynamicSpacing = 0;
        if (totalPathLength > textWidth && textStr.length > 1) {
          const extraSpace = totalPathLength - textWidth;
          const perCharSpace = extraSpace / (textStr.length - 1);
          dynamicSpacing = (perCharSpace / fontSize) * 1000;
        }

        const text = new fabric.IText(textStr, {
          left: path.left,
          top: path.top,
          fontFamily: fontFamily,
          fontSize: fontSize,
          fill: '#14b8a6',
          charSpacing: dynamicSpacing,
          path: path,
          pathAlign: 'center',
          pathStartOffset: 5,
          name: 'text_on_path_' + this.generateId()
        } as any);

        // Store path length for future recalculations
        (text as any)._pathLength = totalPathLength;

        this.canvas.add(text);
        this.canvas.setActiveObject(text);

        // Reset mode
        this.isTextOnPathMode = false;
        this.canvas.isDrawingMode = false;
        this.canvas.defaultCursor = 'default';
        this.canvas.requestRenderAll();
        this.savePageState();
      }
    });

    this.canvas.on('text:changed', (opt: any) => {
      const obj = opt.target;
      if (obj && obj.path && (obj as any)._pathLength) {
        this.recalculatePathTextSpacing(obj);
      }
    });

    this.canvas.on('object:modified', () => {
      this.savePageState();
      this.updateFloatingToolbar();
    });
    this.canvas.on('object:moving', () => this.updateFloatingToolbar());
    this.canvas.on('object:scaling', () => this.updateFloatingToolbar());
    this.canvas.on('object:rotating', () => this.updateFloatingToolbar());

    // Add zooming via mouse wheel (Ctrl + scroll)
    this.canvas.on('mouse:wheel', (opt: any) => {
      const evt = opt.e;
      if (evt.ctrlKey) {
        const delta = evt.deltaY;
        let zoom = this.canvas.getZoom();
        zoom *= 0.999 ** delta;
        if (zoom > 20) zoom = 20;
        if (zoom < 0.1) zoom = 0.1;

        // Wrap in setTimeout to trigger Angular change detection
        setTimeout(() => {
          this.currentZoom = zoom;
        }, 0);

        this.canvas.setZoom(zoom);
        this.canvas.setDimensions({ width: this.docWidth * zoom, height: this.docHeight * zoom });
        evt.preventDefault();
        evt.stopPropagation();
      }
    });

    this.canvas.on('mouse:down', (opt: any) => {
      // Only left click (0) should add points in polygon mode
      if (this.isPolygonMode && opt.e.button === 0) {
        this.addPolygonPoint(opt);
      }
    });

    this.canvas.on('mouse:move', (opt: any) => {
      if (this.isPolygonMode && this.activeLine) {
        const pointer = this.canvas.getScenePoint(opt.e);
        this.activeLine.set({ x2: pointer.x, y2: pointer.y });
        this.canvas.renderAll();
      }
    });
  }

  onObjectSelected(obj: any) {
    if (!obj) return;
    this.activeObject = obj;
    this.activeObjectType = obj.type || null;
    this.selectedObjectId = obj.name || null;

    if (this.activeObjectType === 'i-text' || this.activeObjectType === 'text') {
      this.textProps = {
        fontFamily: obj.fontFamily || 'Inter',
        fontSize: obj.fontSize || 40,
        fill: obj.fill as string || '#000000',
        fontWeight: obj.fontWeight as string || 'normal',
        fontStyle: obj.fontStyle as string || 'normal',
        underline: obj.underline || false,
        textAlign: obj.textAlign || 'left'
      };
    } else if (['rect', 'circle', 'triangle', 'polygon', 'polyline', 'path'].includes(this.activeObjectType || '')) {
      this.shapeProps = {
        fill: (obj.fill as string) || '#14b8a6',
        stroke: (obj.stroke as string) || '#000000',
        strokeWidth: obj.strokeWidth || 0,
        rx: obj.rx || 0,
        ry: obj.ry || 0
      };
    } else if (this.activeObjectType === 'image') {
      this.imageProps = {
        borderRadius: (obj as any).borderRadius || 0,
        stroke: obj.stroke as string || '#000000',
        strokeWidth: obj.strokeWidth || 0,
        shadow: !!obj.shadow,
        frame: (obj as any).frame || 'none',
        maskOffsetX: obj.clipPath ? (obj.clipPath.left || 0) : 0,
        maskOffsetY: obj.clipPath ? (obj.clipPath.top || 0) : 0,
        maskScale: obj.clipPath ? (obj.clipPath.scaleX || 1) : 1
      };
    }

    this.commonProps = {
      opacity: obj.opacity !== undefined ? obj.opacity : 1,
      hasShadow: !!obj.shadow
    };

    this.showFloatingToolbar = true;
    setTimeout(() => this.updateFloatingToolbar(), 0);
  }

  onObjectCleared() {
    this.activeObject = null;
    this.activeObjectType = null;
    this.selectedObjectId = null;
    this.showFloatingToolbar = false;
  }

  updateFloatingToolbar() {
    const active = this.canvas?.getActiveObject();
    if (!active || this.isDrawingMode) {
      this.showFloatingToolbar = false;
      return;
    }
    this.showFloatingToolbar = true;
  }

  generateId() {
    return Math.random().toString(36).substring(2, 9);
  }

  @HostListener('window:resize')
  onResize() {
    this.centerCanvas();
  }

  centerCanvas() {
    // Basic wrapper handles centering via flex, so we just trigger change detection
  }

  @HostListener('window:keydown', ['$event'])
  handleKeyDown(event: KeyboardEvent) {
    if (event.key === 'Delete' || event.key === 'Backspace') {
      if (['INPUT', 'TEXTAREA'].includes((event.target as HTMLElement).tagName)) {
        return;
      }
      const activeObject = this.canvas?.getActiveObject();
      if (activeObject && !(activeObject as any).isEditing) {
        this.deleteSelected();
      }
    }
  }

  setActiveTool(tool: ActiveTool) {
    if (this.activeTool === tool) {
      this.activeTool = null;
    } else {
      this.activeTool = tool;
    }

    // Auto-stop drawing modes if switching away from the 'draw' or 'text' tool
    if (this.activeTool !== 'draw' && this.activeTool !== 'text') {
      if (this.isDrawingMode) {
        this.isDrawingMode = false;
        this.canvas.isDrawingMode = false;
      }
      if (this.isPolygonMode) {
        this.isPolygonMode = false;
        this.canvas.selection = true;
        this.canvas.defaultCursor = 'default';
        this.clearTempPolygon();
      }
      this.isTextOnPathMode = false;
    }
  }

  // --- Document Settings ---
  updateCanvasSize() {
    this.canvas.setDimensions({ width: this.docWidth, height: this.docHeight });
    this.savePageState();
  }

  updateCanvasBg() {
    this.canvas.backgroundColor = this.canvasBgColor;
    this.canvas.requestRenderAll();
    this.savePageState();
  }

  applyPreset(event: any) {
    const val = event.target.value;
    if (val === 'a4v') { this.docWidth = 794; this.docHeight = 1123; }
    else if (val === 'a4h') { this.docWidth = 1123; this.docHeight = 794; }
    else if (val === 'insta') { this.docWidth = 1080; this.docHeight = 1080; }
    this.updateCanvasSize();
  }

  zoomCanvas(factor: number) {
    this.currentZoom *= factor;
    this.canvas.setZoom(this.currentZoom);
    this.canvas.setDimensions({ width: this.docWidth * this.currentZoom, height: this.docHeight * this.currentZoom });
  }

  // --- Templates ---
  applyTemplate(type: string) {
    this.canvas.clear();

    if (type === 'vertical') {
      this.docWidth = 794;
      this.docHeight = 1123;
      this.canvasBgColor = '#fda085';
    } else if (type === 'horizontal') {
      this.docWidth = 1123;
      this.docHeight = 794;
      this.canvasBgColor = '#8fd3f4';
    } else if (type === 'square') {
      this.docWidth = 1080;
      this.docHeight = 1080;
      this.canvasBgColor = '#f6d365';
    }

    this.updateCanvasSize();
    this.canvas.backgroundColor = this.canvasBgColor;

    if (type === 'vertical') {
      const text = new fabric.IText('Vertical Poster', { left: 80, top: 100, fontSize: 80, fill: '#ffffff', fontFamily: 'Inter', fontWeight: 'bold' });
      this.canvas.add(text);
    } else if (type === 'horizontal') {
      const text = new fabric.IText('Horizontal Presentation', { left: 80, top: 100, fontSize: 80, fill: '#ffffff', fontFamily: 'Inter', fontWeight: 'bold' });
      this.canvas.add(text);
    } else if (type === 'square') {
      const text = new fabric.IText('Square Social Post', { left: 80, top: 100, fontSize: 80, fill: '#ffffff', fontFamily: 'Inter', fontWeight: 'bold' });
      this.canvas.add(text);
    }

    this.canvas.requestRenderAll();
    this.savePageState();
  }

  // --- Text ---
  addText(customText: string = 'Your Text Here', fontFamily: string = 'Inter') {
    const text = new fabric.IText(customText, {
      left: this.docWidth / 2 - 100,
      top: this.docHeight / 2 - 20,
      fontFamily: fontFamily || this.textProps.fontFamily,
      fontSize: this.textProps.fontSize,
      fill: this.textProps.fill,
      name: 'text_' + this.generateId()
    } as any);
    this.canvas.add(text);
    this.canvas.setActiveObject(text);
    this.canvas.requestRenderAll();
    this.savePageState();
  }

  addCurvedText() {
    this.isTextOnPathMode = !this.isTextOnPathMode;
    if (this.isTextOnPathMode) {
      this.canvas.isDrawingMode = true;
      this.canvas.freeDrawingBrush = new fabric.PencilBrush(this.canvas);
      this.canvas.freeDrawingBrush.width = 2;
      this.canvas.freeDrawingBrush.color = '#14b8a6';
      this.canvas.defaultCursor = 'crosshair';
      this.canvas.discardActiveObject();
    } else {
      this.canvas.isDrawingMode = false;
      this.canvas.defaultCursor = 'default';
    }
    this.canvas.requestRenderAll();
  }

  recalculatePathTextSpacing(text: any) {
    if (!text || !text.path || !text._pathLength) return;

    const totalPathLength = text._pathLength;
    const textStr = text.text || '';
    const fontSize = text.fontSize || 32;
    const fontFamily = text.fontFamily || 'Inter';

    // Measure Text Width (without extra spacing)
    const tempText = new fabric.Text(textStr, { fontSize, fontFamily });
    const textWidth = tempText.width;

    // Calculate dynamic charSpacing
    let dynamicSpacing = 0;
    const buffer = 10; // 5px at each end
    if (totalPathLength > (textWidth + buffer) && textStr.length > 1) {
      const extraSpace = totalPathLength - (textWidth + buffer);
      const perCharSpace = extraSpace / (textStr.length - 1);
      dynamicSpacing = (perCharSpace / fontSize) * 1000;
    } else {
      // If text is longer than path, reset spacing to 0
      dynamicSpacing = 0;
    }

    text.set({ charSpacing: dynamicSpacing });
    this.canvas.requestRenderAll();
  }

  updateTextProp(prop: string, value: any) {
    const obj = this.canvas.getActiveObject() as any;
    if (obj && (obj.type === 'i-text' || obj.type === 'text')) {
      obj.set(prop, value);
      this.canvas.requestRenderAll();
      this.savePageState();
    }
  }

  toggleTextProp(prop: string, onVal: any, offVal: any) {
    const obj = this.canvas.getActiveObject() as any;
    if (obj && (obj.type === 'i-text' || obj.type === 'text')) {
      const current = obj.get(prop);
      obj.set(prop, current === onVal ? offVal : onVal);
      // Sync local props
      (this.textProps as any)[prop] = obj.get(prop);
      this.canvas.requestRenderAll();
      this.savePageState();
    }
  }

  // --- Photos ---
  onDeviceUpload(event: any) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (f) => {
      const data = f.target?.result as string;
      fabric.Image.fromURL(data).then(img => {
        img.scaleToWidth(Math.min(300, this.docWidth - 40));
        img.set({
          left: this.docWidth / 2 - (img.getScaledWidth() / 2),
          top: this.docHeight / 2 - (img.getScaledHeight() / 2),
          name: 'img_' + this.generateId()
        } as any);
        this.canvas.add(img);
        this.canvas.setActiveObject(img);
        this.canvas.requestRenderAll();
        this.savePageState();
      });
    };
    reader.readAsDataURL(file);
  }

  addPhotoFromUrl() {
    if (!this.imageUrlInput) return;
    fabric.Image.fromURL(this.imageUrlInput, { crossOrigin: 'anonymous' }).then(img => {
      img.scaleToWidth(Math.min(300, this.docWidth - 40));
      img.set({
        left: this.docWidth / 2 - (img.getScaledWidth() / 2),
        top: this.docHeight / 2 - (img.getScaledHeight() / 2),
        name: 'img_' + this.generateId()
      } as any);
      this.canvas.add(img);
      this.canvas.setActiveObject(img);
      this.canvas.requestRenderAll();
      this.imageUrlInput = '';
      this.savePageState();
    }).catch(err => {
      alert('Could not load image. It might be blocked by CORS.');
    });
  }

  // --- Icons ---
  addTextIcon(char: string) {
    const text = new fabric.IText(char, {
      left: this.docWidth / 2 - 40,
      top: this.docHeight / 2 - 40,
      fontFamily: 'Arial', // Fallback for standard unicode symbols
      fontSize: 80,
      fill: '#14b8a6',
      name: 'icon_' + this.generateId()
    } as any);
    this.canvas.add(text);
    this.canvas.setActiveObject(text);
    this.canvas.requestRenderAll();
    this.savePageState();
  }

  // --- Shapes ---
  addShape(type: 'rect' | 'circle' | 'triangle') {
    let shape;
    const commonOpts: any = { left: this.docWidth / 2 - 50, top: this.docHeight / 2 - 50, fill: this.shapeProps.fill, stroke: this.shapeProps.stroke, strokeWidth: this.shapeProps.strokeWidth, name: type + '_' + this.generateId() };
    if (type === 'rect') shape = new fabric.Rect({ ...commonOpts, width: 100, height: 100, rx: this.shapeProps.rx, ry: this.shapeProps.ry });
    else if (type === 'circle') shape = new fabric.Circle({ ...commonOpts, radius: 50 });
    else if (type === 'triangle') shape = new fabric.Triangle({ ...commonOpts, width: 100, height: 100 });

    if (shape) {
      this.canvas.add(shape);
      this.canvas.setActiveObject(shape);
      this.canvas.requestRenderAll();
      this.savePageState();
    }
  }

  updateImageProp(prop: string, value: any) {
    const obj = this.canvas.getActiveObject() as any;
    if (obj && obj.type === 'image') {
      if (prop === 'borderRadius') {
        obj.borderRadius = value;
        const rect = new fabric.Rect({
          originX: 'center',
          originY: 'center',
          left: this.imageProps.maskOffsetX,
          top: this.imageProps.maskOffsetY,
          width: obj.width,
          height: obj.height,
          rx: value,
          ry: value
        });
        obj.set('clipPath', rect);
      } else if (['maskOffsetX', 'maskOffsetY'].includes(prop)) {
        (this.imageProps as any)[prop] = value;
        if (obj.clipPath) {
          obj.clipPath.set({
            left: this.imageProps.maskOffsetX,
            top: this.imageProps.maskOffsetY,
            scaleX: this.imageProps.maskScale,
            scaleY: this.imageProps.maskScale
          });
        }
      } else {
        obj.set(prop, value);
      }
      (this.imageProps as any)[prop] = value;
      this.canvas.requestRenderAll();
      this.savePageState();
    }
  }

  applyImageMask(type: 'circle' | 'star' | 'triangle' | 'none') {
    const obj = this.canvas.getActiveObject() as any;
    if (obj && obj.type === 'image') {
      this.imageProps.maskOffsetX = 0;
      this.imageProps.maskOffsetY = 0;
      this.imageProps.maskScale = 1;

      if (type === 'none') {
        obj.set('clipPath', null);
      } else if (type === 'circle') {
        const radius = Math.min(obj.width, obj.height) / 2;
        obj.set('clipPath', new fabric.Circle({ radius, originX: 'center', originY: 'center', left: 0, top: 0 }));
      } else if (type === 'triangle') {
        obj.set('clipPath', new fabric.Triangle({ width: obj.width, height: obj.height, originX: 'center', originY: 'center', left: 0, top: 0 }));
      } else if (type === 'star') {
        const starPath = 'M 0 -50 L 12 -18 L 47 -18 L 19 7 L 29 40 L 0 20 L -29 40 L -19 7 L -47 -18 L -12 -18 Z';
        const star = new fabric.Path(starPath, {
          originX: 'center',
          originY: 'center',
          left: 0,
          top: 0,
          scaleX: obj.width / 100,
          scaleY: obj.height / 100
        });
        obj.set('clipPath', star);
      }
      obj.set('dirty', true);
      this.canvas.requestRenderAll();
      this.savePageState();
    }
  }

  panImageMask(dir: 'up' | 'down' | 'left' | 'right') {
    const obj = this.canvas.getActiveObject() as any;
    if (obj && obj.type === 'image' && obj.clipPath) {
      const step = 10;
      if (dir === 'up') this.imageProps.maskOffsetY -= step;
      if (dir === 'down') this.imageProps.maskOffsetY += step;
      if (dir === 'left') this.imageProps.maskOffsetX -= step;
      if (dir === 'right') this.imageProps.maskOffsetX += step;

      obj.clipPath.set({
        left: this.imageProps.maskOffsetX,
        top: this.imageProps.maskOffsetY
      });

      obj.set('dirty', true);
      this.canvas.requestRenderAll();
      this.savePageState();
    }
  }

  applyImageFrame(type: string) {
    const obj = this.canvas.getActiveObject() as any;
    if (obj && obj.type === 'image') {
      this.imageProps.frame = type;
      if (type === 'modern') {
        obj.set({ stroke: '#14b8a6', strokeWidth: 10, padding: 5 });
      } else if (type === 'classic') {
        obj.set({ stroke: '#4b2c20', strokeWidth: 20, padding: 2 });
      } else if (type === 'white') {
        obj.set({ stroke: '#ffffff', strokeWidth: 15, shadow: new fabric.Shadow({ color: 'rgba(0,0,0,0.2)', blur: 10, offsetX: 5, offsetY: 5 }) });
      } else {
        obj.set({ strokeWidth: 0, shadow: null });
      }
      this.canvas.requestRenderAll();
      this.savePageState();
    }
  }

  updateShapeProp(prop: string, value: any) {
    const obj = this.canvas.getActiveObject() as any;
    if (obj && ['rect', 'circle', 'triangle', 'polygon', 'polyline', 'path'].includes(obj.type)) {
      if (value === 'transparent') {
        obj.set(prop, 'transparent');
        (this.shapeProps as any)[prop] = 'transparent';
      } else {
        obj.set(prop, value);
      }
      this.canvas.requestRenderAll();
      this.savePageState();
    }
  }

  updateCommonProp(prop: string, value: any) {
    const obj = this.canvas.getActiveObject() as any;
    if (obj) {
      obj.set(prop, parseFloat(value));
      this.canvas.requestRenderAll();
      this.savePageState();
    }
  }

  toggleShadow(hasShadow: boolean) {
    const obj = this.canvas.getActiveObject() as any;
    if (obj) {
      if (hasShadow) {
        obj.set('shadow', new fabric.Shadow({
          color: 'rgba(0,0,0,0.3)',
          blur: 10,
          offsetX: 5,
          offsetY: 5
        }));
      } else {
        obj.set('shadow', null);
      }
      this.canvas.requestRenderAll();
      this.savePageState();
    }
  }

  toggleDrawingMode() {
    this.isDrawingMode = !this.isDrawingMode;
    this.canvas.isDrawingMode = this.isDrawingMode;
    if (this.isDrawingMode) {
      this.isPolygonMode = false;
      this.clearTempPolygon();
      this.canvas.freeDrawingCursor = 'crosshair';
      this.updateBrush();
    }
  }

  updateBrush() {
    if (!this.canvas.isDrawingMode) return;
    this.canvas.freeDrawingBrush = new fabric.PencilBrush(this.canvas);
    this.canvas.freeDrawingBrush.color = this.drawingProps.color;
    this.canvas.freeDrawingBrush.width = Number(this.drawingProps.width);
  }

  // --- Polygon Mode ---
  togglePolygonMode() {
    this.isPolygonMode = !this.isPolygonMode;
    if (this.isPolygonMode) {
      this.isDrawingMode = false;
      this.canvas.isDrawingMode = false;
      this.canvas.selection = false;
      this.polygonPoints = [];
      this.canvas.defaultCursor = 'crosshair';
      this.canvas.discardActiveObject();
      this.canvas.requestRenderAll();
    } else {
      this.canvas.selection = true;
      this.canvas.defaultCursor = 'default';
      this.clearTempPolygon();
    }
  }

  addPolygonPoint(opt: any) {
    const pointer = this.canvas.getScenePoint(opt.e);
    const x = pointer.x;
    const y = pointer.y;

    // Check if clicking near the first point to close (if at least 3 points exist)
    if (this.polygonPoints.length >= 3) {
      const firstPoint = this.polygonPoints[0];
      const distance = Math.sqrt(Math.pow(x - firstPoint.x, 2) + Math.pow(y - firstPoint.y, 2));
      if (distance < 15 / this.canvas.getZoom()) {
        this.finishPolygon();
        return;
      }
    }

    this.polygonPoints.push({ x, y });

    // Add visual point marker
    const marker = new fabric.Circle({
      left: x,
      top: y,
      radius: 4 / this.canvas.getZoom(),
      fill: '#14b8a6',
      stroke: '#ffffff',
      strokeWidth: 1 / this.canvas.getZoom(),
      originX: 'center',
      originY: 'center',
      selectable: false,
      evented: false
    });
    this.canvas.add(marker);
    this.tempPointMarkers.push(marker);

    // Add line from previous point
    if (this.polygonPoints.length > 1) {
      const prevPoint = this.polygonPoints[this.polygonPoints.length - 2];
      const line = new fabric.Line([prevPoint.x, prevPoint.y, x, y], {
        stroke: '#14b8a6',
        strokeWidth: 2 / this.canvas.getZoom(),
        selectable: false,
        evented: false
      });
      this.canvas.add(line);
      this.tempLines.push(line);
    }

    // Create/Update active line following the cursor
    if (this.activeLine) {
      this.canvas.remove(this.activeLine);
    }
    this.activeLine = new fabric.Line([x, y, x, y], {
      stroke: '#14b8a6',
      strokeWidth: 2 / this.canvas.getZoom(),
      strokeDashArray: [5, 5],
      selectable: false,
      evented: false
    });
    this.canvas.add(this.activeLine);
  }

  finishPolygon(isClosed: boolean = true) {
    if (this.polygonPoints.length < 2) {
      this.togglePolygonMode();
      return;
    }

    let shape;
    if (isClosed && this.polygonPoints.length >= 3) {
      shape = new fabric.Polygon(this.polygonPoints, {
        fill: this.shapeProps.fill === 'transparent' ? 'transparent' : this.shapeProps.fill,
        stroke: this.shapeProps.stroke,
        strokeWidth: this.shapeProps.strokeWidth || 2,
        name: 'polygon_' + this.generateId()
      } as any);
    } else {
      shape = new fabric.Polyline(this.polygonPoints, {
        fill: 'transparent',
        stroke: this.shapeProps.stroke,
        strokeWidth: this.shapeProps.strokeWidth || 2,
        name: 'polyline_' + this.generateId()
      } as any);
    }

    this.canvas.add(shape);
    this.canvas.setActiveObject(shape);
    this.savePageState();
    this.togglePolygonMode();
  }

  clearTempPolygon() {
    this.tempLines.forEach(l => this.canvas.remove(l));
    this.tempPointMarkers.forEach(m => this.canvas.remove(m));
    if (this.activeLine) this.canvas.remove(this.activeLine);
    this.tempLines = [];
    this.tempPointMarkers = [];
    this.activeLine = null;
    this.polygonPoints = [];
    this.canvas.renderAll();
  }

  // --- Layers ---
  updateLayers() {
    if (!this.canvas) return;
    const objects = this.canvas.getObjects();
    this.canvasLayers = objects.map((obj: any, index) => ({
      id: obj.name || `layer_${index}`,
      type: obj.type,
      obj: obj,
      visible: obj.visible !== false,
      locked: obj.selectable === false || obj.evented === false
    })).reverse(); // top object first
  }

  selectLayer(layer: any) {
    this.canvas.setActiveObject(layer.obj);
    this.canvas.requestRenderAll();
  }

  onDragStart(event: DragEvent, index: number) {
    this.draggedLayerIndex = index;
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', index.toString());
    }
  }

  onDragOver(event: DragEvent, index: number) {
    event.preventDefault();
    if (this.draggedLayerIndex === null || this.draggedLayerIndex === index) return;
    this.dragOverLayerIndex = index;
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'move';
    }
  }

  onDrop(event: DragEvent, index: number) {
    event.preventDefault();
    if (this.draggedLayerIndex === null || this.draggedLayerIndex === index) {
      this.dragOverLayerIndex = null;
      return;
    }

    const draggedLayer = this.canvasLayers[this.draggedLayerIndex];
    this.canvasLayers.splice(this.draggedLayerIndex, 1);
    this.canvasLayers.splice(index, 0, draggedLayer);

    this.syncLayersToCanvas();

    this.draggedLayerIndex = null;
    this.dragOverLayerIndex = null;
    this.savePageState();
  }

  onDragEnd(event: DragEvent) {
    this.draggedLayerIndex = null;
    this.dragOverLayerIndex = null;
  }

  syncLayersToCanvas() {
    const newOrder = [...this.canvasLayers].reverse();
    newOrder.forEach((layer, i) => {
      this.canvas.moveObjectTo(layer.obj, i);
    });
    this.canvas.requestRenderAll();
  }


  moveLayerUp(layer: any) {
    this.canvas.bringObjectForward(layer.obj);
    this.canvas.requestRenderAll();
    this.updateLayers();
    this.savePageState();
  }

  moveLayerDown(layer: any) {
    this.canvas.sendObjectBackwards(layer.obj);
    this.canvas.requestRenderAll();
    this.updateLayers();
    this.savePageState();
  }

  toggleLayerVisibility(layer: any) {
    layer.obj.set('visible', !layer.visible);
    this.canvas.requestRenderAll();
    this.updateLayers();
    this.savePageState();
  }

  toggleLayerLock(layer: any) {
    const isLocked = !layer.locked;
    layer.obj.set({
      selectable: !isLocked,
      evented: !isLocked,
      lockMovementX: isLocked,
      lockMovementY: isLocked,
      lockRotation: isLocked,
      lockScalingX: isLocked,
      lockScalingY: isLocked
    });
    this.canvas.discardActiveObject();
    this.canvas.requestRenderAll();
    this.updateLayers();
    this.savePageState();
  }

  deleteLayer(layer: any) {
    this.canvas.remove(layer.obj);
    this.savePageState();
  }

  getLayerIcon(type: string): string {
    if (type === 'i-text' || type === 'text') return 'pi-language';
    if (type === 'image') return 'pi-image';
    if (type === 'rect') return 'pi-stop';
    if (type === 'circle') return 'pi-circle';
    if (type === 'triangle') return 'pi-caret-up';
    if (type === 'path') return 'pi-pencil';
    return 'pi-box';
  }

  deleteSelected() {
    const activeObjects = this.canvas.getActiveObjects();
    if (activeObjects.length) {
      activeObjects.forEach(obj => this.canvas.remove(obj));
      this.canvas.discardActiveObject();
      this.canvas.requestRenderAll();
      this.savePageState();
    }
  }

  // --- Pages ---
  savePageState() {
    if (!this.canvas) return;
    const json = JSON.stringify(this.canvas.toJSON());
    this.pages[this.currentPageIndex] = json;
  }

  addNewPage() {
    this.savePageState();
    this.pages.push('');
    this.switchPage(this.pages.length - 1);
  }

  switchPage(index: number) {
    this.savePageState(); // save current before switching
    this.currentPageIndex = index;
    const json = this.pages[index];
    if (json) {
      this.canvas.loadFromJSON(json, () => {
        this.canvas.requestRenderAll();
        this.updateLayers();
      });
    } else {
      this.canvas.clear();
      this.canvas.backgroundColor = this.canvasBgColor;
      this.canvas.requestRenderAll();
      this.updateLayers();
    }
  }

  // --- Misc ---
  goHome() {
    this.router.navigate(['/']);
  }

  preview() {
    alert('Preview mode would launch a full screen view of the canvas.');
  }

  download() {
    const dataURL = this.canvas.toDataURL({ format: 'png', quality: 1, multiplier: 1 });
    const link = document.createElement('a');
    link.download = `${this.documentName}.png`;
    link.href = dataURL;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  saveDocument() {
    this.savePageState(); // Ensure current page is saved to this.pages array

    const documentData = {
      name: this.documentName,
      width: this.docWidth,
      height: this.docHeight,
      unit: this.docUnit,
      backgroundColor: this.canvasBgColor,
      pages: this.pages, // This contains the Fabric JSON strings
      exportedAt: new Date().toISOString()
    };

    console.log('--- SAVING DOCUMENT DATA ---');
    console.log(documentData);
    alert('Document data has been logged to the console.');
  }

  help() {
    alert('Creative Editor Help: Use the sidebar to add elements. Drag to arrange. Use Layers panel to lock or hide objects.');
  }
}
