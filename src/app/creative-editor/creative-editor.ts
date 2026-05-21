import { Component, OnInit, AfterViewInit, ElementRef, ViewChild, OnDestroy, HostListener, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { Location } from '@angular/common';
import * as fabric from 'fabric';
import { jsPDF } from 'jspdf';
import JSZip from 'jszip';
import { Magazine } from '../models/magazine.model';
import { MagazineService } from '../services/magazine.service';

type ActiveTool = 'settings' | 'templates' | 'text' | 'photos' | 'videos' | 'draw' | 'icons' | 'shapes' | 'layers' | null;

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
  activeObjectName: string | null = null;
  selectedObjectId: string | null = null;
  activeObject: any = null;

  draggedLayerIndex: number | null = null;
  dragOverLayerIndex: number | null = null;
  private panListeners: (() => void)[] = [];

  showFloatingToolbar = false;
  showDownloadMenu = false;
  activePopover: 'transform' | 'shadow' | 'mask' | 'frame' | 'shape' | null = null;

  textProps = { fontFamily: 'Inter', fontSize: 40, fill: '#000000', fontWeight: 'normal', fontStyle: 'normal', underline: false, textAlign: 'left' };
  shapeProps: any = { fill: '#14b8a6', stroke: '#000000', strokeWidth: 0, rx: 0, ry: 0 };
  imageProps = { borderRadius: 0, stroke: '#000000', strokeWidth: 0, shadow: false, frame: 'none', maskOffsetX: 0, maskOffsetY: 0, maskScale: 1, maskType: 'none' };
  commonProps = { opacity: 1, hasShadow: false };
  shadowProps = { color: 'rgba(0,0,0,0.3)', blur: 10, offsetX: 5, offsetY: 5, type: 'drop' }; // 'drop', 'glow', 'inner'
  transformProps = { widthPercent: 0, heightPercent: 0, widthPx: 0, heightPx: 0, angle: 0, usePx: true, lockAspect: true };

  imageUrlInput = '';
  videoUrlInput = '';
  private videoRenderLoopRunning = false;
  canvasLayers: any[] = [];
  isDrawingMode = false;
  isTextOnPathMode = false;
  drawingProps = {
    width: 5,
    color: '#14b8a6'
  };

  elementCounters: { [key: string]: number } = {};

  isPolygonMode = false;
  polygonPoints: { x: number, y: number }[] = [];
  tempLines: fabric.Line[] = [];
  activeLine: fabric.Line | null = null;
  tempPointMarkers: fabric.Circle[] = [];

  documentId: string | null = null;
  isSaving = false;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private location: Location,
    private cdr: ChangeDetectorRef,
    private magazineService: MagazineService
  ) { }

  ngOnInit() {
    // Check if we're editing an existing document
    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (id) {
        this.documentId = id;
        this.loadExistingDocument(id);
      } else {
        this.pages.push(''); // Initial empty page for new document
      }
    });
  }

  loadExistingDocument(id: string) {
    const doc = this.magazineService.getMagazine(id);
    if (doc) {
      this.documentName = doc.title;
      this.docWidth = doc.settings.width;
      this.docHeight = doc.settings.height;
      this.docUnit = doc.settings.unit;
      this.canvasBgColor = doc.settings.canvasBgColor;
      this.pages = [...doc.pages];
      if (this.pages.length === 0) {
        this.pages.push('');
      }
    } else {
      this.pages.push('');
    }
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

    // If loading an existing document, directly load page data WITHOUT saving empty canvas state
    if (this.documentId && this.pages[0]) {
      setTimeout(async () => {
        await this.loadPageDirect(0);
      }, 100);
    }
  }

  ngOnDestroy() {
    this.videoRenderLoopRunning = false;
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
      fireRightClick: true,
      stopContextMenu: true
    });

    this.setupCanvasEvents();
    this.centerCanvas();
  }

  generateObjectName(type: string): string {
    const typeMap: { [key: string]: string } = {
      'i-text': 'txt',
      'text': 'txt',
      'rect': 'shape',
      'circle': 'shape',
      'triangle': 'shape',
      'polygon': 'shape',
      'polyline': 'shape',
      'path': 'draw',
      'image': 'img',
      'group': 'grp'
    };
    const baseType = typeMap[type] || 'obj';

    if (!this.elementCounters[baseType]) {
      this.elementCounters[baseType] = 0;
    }

    let isUnique = false;
    let newName = '';
    while (!isUnique) {
      this.elementCounters[baseType]++;
      newName = `${baseType}_${this.elementCounters[baseType]}`;
      // Check if any existing object has this name
      const existing = this.canvas.getObjects().find((obj: any) => obj.name === newName);
      if (!existing) {
        isUnique = true;
      }
    }

    return newName;
  }

  setupCanvasEvents() {
    this.canvas.on('selection:created', (e) => this.onObjectSelected(e.selected?.[0]));
    this.canvas.on('selection:updated', (e) => this.onObjectSelected(e.selected?.[0]));
    this.canvas.on('selection:cleared', () => this.onObjectCleared());
    this.canvas.on('object:added', (e: any) => {
      if (e.target && !e.target.name && e.target.type !== 'activeSelection') {
        e.target.set('name', this.generateObjectName(e.target.type));
      }
      this.updateLayers();
    });
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
          pathStartOffset: 5
        } as any);

        // Store path length for future recalculations
        (text as any)._pathLength = totalPathLength;

        this.canvas.add(text);
        this.selectActiveObject(text);

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
      // Handle right click to abort/finish tools
      if (opt.e.button === 2) {
        if (this.isDrawingMode) {
          this.toggleDrawingMode();
        }
        if (this.isPolygonMode) {
          if (this.polygonPoints.length > 1) {
            this.finishPolygon(false); // Finish as open polyline
          } else {
            this.togglePolygonMode(); // Cancel entirely
          }
        }
        return;
      }

      // Only left click (0) should add points in polygon mode
      if (this.isPolygonMode && opt.e.button === 0) {
        this.addPolygonPoint(opt);
      }
    });

    this.canvas.on('mouse:dblclick', (opt: any) => {
      if (this.isPolygonMode) {
        // Double click creates 2 mousedown events. Remove the second one.
        if (this.polygonPoints.length > 1) {
          this.polygonPoints.pop();
        }
        this.finishPolygon(false); // Finish as open polyline, like the UI button
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

  selectActiveObject(obj: any) {
    this.canvas.setActiveObject(obj);
    this.onObjectSelected(obj);
    this.canvas.requestRenderAll();
  }

  onObjectSelected(obj: any) {
    if (!obj) return;
    this.activeObject = obj;
    this.activeObjectType = obj.type || null;
    this.activeObjectName = obj.name || obj.type || null;
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
        maskScale: obj.clipPath ? (obj.clipPath.scaleX || 1) : 1,
        maskType: 'none'
      };
    }

    this.commonProps = {
      opacity: obj.opacity !== undefined ? obj.opacity : 1,
      hasShadow: !!obj.shadow
    };

    this.updateTransformPropsFromObject(obj);

    this.showFloatingToolbar = true;
    setTimeout(() => this.updateFloatingToolbar(), 0);
  }

  onObjectCleared() {
    this.activeObject = null;
    this.activeObjectType = null;
    this.activeObjectName = null;
    this.selectedObjectId = null;
    this.showFloatingToolbar = false;
    this.activePopover = null;
  }

  togglePopover(popoverName: 'transform' | 'shadow' | 'mask' | 'frame' | 'shape') {
    if (this.activePopover === popoverName) {
      this.activePopover = null;
    } else {
      this.activePopover = popoverName;
    }
  }

  closePopover() {
    this.activePopover = null;
  }

  updateFloatingToolbar() {
    const active = this.canvas?.getActiveObject();
    if (!active || this.isDrawingMode) {
      this.showFloatingToolbar = false;
      return;
    }
    this.updateTransformPropsFromObject(active);
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
    } else if (event.key === 'd' && (event.ctrlKey || event.metaKey)) {
      if (['INPUT', 'TEXTAREA'].includes((event.target as HTMLElement).tagName)) {
        return;
      }
      event.preventDefault();
      this.duplicateSelected();
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
  addText(customText: string = 'Your Text Here', fontFamily: string = 'Inter', fontSize: number = 40, fontWeight: string = 'normal') {
    const text = new fabric.IText(customText, {
      left: this.docWidth / 2 - 100,
      top: this.docHeight / 2 - 20,
      fontFamily: fontFamily || this.textProps.fontFamily,
      fontSize: fontSize,
      fontWeight: fontWeight,
      fill: this.textProps.fill,
      name: this.generateObjectName('text'),
      textAlign: 'left'
    } as any);
    this.canvas.add(text);
    this.selectActiveObject(text);
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
      (this.textProps as any)[prop] = value;
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
          name: this.generateObjectName('img')
        } as any);
        this.canvas.add(img);
        this.selectActiveObject(img);
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
        name: this.generateObjectName('img')
      } as any);
      this.canvas.add(img);
      this.selectActiveObject(img);
      this.canvas.requestRenderAll();
      this.imageUrlInput = '';
      this.savePageState();
    }).catch(err => {
      alert('Could not load image. It might be blocked by CORS.');
    });
  }

  // --- Videos ---
  onVideoDeviceUpload(event: any) {
    const file = event.target.files[0];
    if (file) {
      const url = URL.createObjectURL(file);
      this.addVideoToCanvas(url);
    }
    event.target.value = '';
  }

  addVideoFromUrl() {
    if (this.videoUrlInput) {
      this.addVideoToCanvas(this.videoUrlInput);
      this.videoUrlInput = '';
    }
  }

  addVideoToCanvas(url: string) {
    const videoEl = document.createElement('video');
    videoEl.crossOrigin = 'anonymous';
    videoEl.muted = true;
    videoEl.loop = true;
    videoEl.src = url;
    videoEl.style.display = 'none';
    document.body.appendChild(videoEl);

    videoEl.addEventListener('loadeddata', () => {
      videoEl.width = videoEl.videoWidth;
      videoEl.height = videoEl.videoHeight;
      videoEl.play();

      const videoObj = new fabric.Image(videoEl, {
        left: this.docWidth / 2 - (videoEl.videoWidth / 2),
        top: this.docHeight / 2 - (videoEl.videoHeight / 2),
        name: this.generateObjectName('video'),
        objectCaching: false,
        isVideo: true,
        videoSrc: url
      } as any);

      const maxWidth = Math.min(400, this.docWidth - 40);
      if (videoObj.width! > maxWidth) {
        videoObj.scaleToWidth(maxWidth);
      }
      
      videoObj.set({
        left: this.docWidth / 2 - (videoObj.getScaledWidth() / 2),
        top: this.docHeight / 2 - (videoObj.getScaledHeight() / 2)
      });

      this.canvas.add(videoObj);
      this.selectActiveObject(videoObj);
      this.canvas.requestRenderAll();
      this.savePageState();
      this.startVideoRenderLoop();
    });
    
    videoEl.load();
  }

  startVideoRenderLoop() {
    if (this.videoRenderLoopRunning) return;
    this.videoRenderLoopRunning = true;
    const render = () => {
      if (this.canvas) {
        const videos = this.canvas.getObjects().filter(obj => (obj as any).getElement && (obj as any).getElement().tagName === 'VIDEO');
        if (videos.length > 0) {
          // Invalidate cache for videos so they continue playing even when a clipPath (corner radius/mask) is applied
          videos.forEach(v => {
            v.set('dirty', true);
          });
          this.canvas.renderAll();
        }
      }
      if (this.videoRenderLoopRunning) {
        fabric.util.requestAnimFrame(render);
      }
    };
    fabric.util.requestAnimFrame(render);
  }

  isVideoSelected(): boolean {
    return this.activeObject && 
           this.activeObjectType === 'image' && 
           typeof this.activeObject.getElement === 'function' && 
           this.activeObject.getElement()?.tagName === 'VIDEO';
  }

  isVideoPlaying(): boolean {
    if (!this.isVideoSelected()) return false;
    const videoEl = this.activeObject.getElement();
    return !videoEl.paused;
  }

  toggleVideoPlay() {
    if (this.isVideoSelected()) {
      const videoEl = this.activeObject.getElement();
      if (videoEl.paused) {
        videoEl.play();
      } else {
        videoEl.pause();
      }
    }
  }

  // --- Icons ---
  addTextIcon(char: string) {
    const text = new fabric.IText(char, {
      left: this.docWidth / 2 - 40,
      top: this.docHeight / 2 - 40,
      fontFamily: 'Arial', // Fallback for standard unicode symbols
      fontSize: 80,
      fill: '#14b8a6',
      name: this.generateObjectName('icon'),
      textAlign: 'center'
    } as any);
    this.canvas.add(text);
    this.selectActiveObject(text);
    this.canvas.requestRenderAll();
    this.savePageState();
  }

  // --- Shapes ---
  addShape(type: 'rect' | 'circle' | 'triangle') {
    let shape;
    const commonOpts: any = { left: this.docWidth / 2 - 50, top: this.docHeight / 2 - 50, fill: this.shapeProps.fill, stroke: this.shapeProps.stroke, strokeWidth: this.shapeProps.strokeWidth };
    if (type === 'rect') shape = new fabric.Rect({ ...commonOpts, width: 100, height: 100, rx: this.shapeProps.rx, ry: this.shapeProps.ry });
    else if (type === 'circle') shape = new fabric.Circle({ ...commonOpts, radius: 50 });
    else if (type === 'triangle') shape = new fabric.Triangle({ ...commonOpts, width: 100, height: 100 });

    if (shape) {
      this.canvas.add(shape);
      this.selectActiveObject(shape);
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
      obj.set(prop, value);
      (this.shapeProps as any)[prop] = value;
      this.canvas.requestRenderAll();
      this.savePageState();
    }
  }

  updateCommonProp(prop: string, value: any) {
    const obj = this.canvas.getActiveObject() as any;
    if (obj) {
      const parsedValue = parseFloat(value);
      obj.set(prop, parsedValue);
      (this.commonProps as any)[prop] = parsedValue;
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
    this.cdr.detectChanges();
  }

  updateBrush() {
    if (!this.canvas.freeDrawingBrush) {
      this.canvas.freeDrawingBrush = new fabric.PencilBrush(this.canvas);
    }
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
    this.cdr.detectChanges();
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
      fill: this.drawingProps.color,
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
        stroke: this.drawingProps.color,
        strokeWidth: Number(this.drawingProps.width) / this.canvas.getZoom(),
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
      stroke: this.drawingProps.color,
      strokeWidth: Number(this.drawingProps.width) / this.canvas.getZoom(),
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
        stroke: this.drawingProps.color,
        strokeWidth: Number(this.drawingProps.width)
      } as any);
    } else {
      shape = new fabric.Polyline(this.polygonPoints, {
        fill: 'transparent',
        stroke: this.drawingProps.color,
        strokeWidth: Number(this.drawingProps.width)
      } as any);
    }

    this.canvas.add(shape);
    this.selectActiveObject(shape);
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
      name: obj.name || obj.type,
      type: obj.type,
      obj: obj,
      visible: obj.visible !== false,
      locked: obj.selectable === false || obj.evented === false
    })).reverse(); // top object first
    this.cdr.detectChanges();
  }

  selectLayer(layer: any) {
    this.selectActiveObject(layer.obj);
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

  duplicateSelected() {
    const activeObject = this.canvas.getActiveObject();
    if (!activeObject) return;

    activeObject.clone().then((cloned: any) => {
      this.canvas.discardActiveObject();
      cloned.set({
        left: cloned.left + 20,
        top: cloned.top + 20,
        evented: true,
      });

      if (cloned.type === 'activeSelection') {
        // For multiple objects, we need to add them individually
        cloned.canvas = this.canvas;
        cloned.forEachObject((obj: any) => {
          this.canvas.add(obj);
        });
        cloned.setCoords();
      } else {
        this.canvas.add(cloned);
      }

      this.selectActiveObject(cloned);
      this.canvas.requestRenderAll();
      this.savePageState();
    });
  }

  alignSelected(alignment: 'left' | 'right' | 'top' | 'bottom' | 'center-h' | 'center-v' | 'center') {
    const obj = this.canvas.getActiveObject();
    if (!obj) return;

    const boundingRect = obj.getBoundingRect();
    const canvasWidth = this.docWidth;
    const canvasHeight = this.docHeight;

    if (alignment === 'left') {
      obj.set('left', obj.left - boundingRect.left);
    } else if (alignment === 'right') {
      obj.set('left', obj.left + (canvasWidth - boundingRect.left - boundingRect.width));
    } else if (alignment === 'top') {
      obj.set('top', obj.top - boundingRect.top);
    } else if (alignment === 'bottom') {
      obj.set('top', obj.top + (canvasHeight - boundingRect.top - boundingRect.height));
    } else if (alignment === 'center-h') {
      obj.set('left', obj.left + (canvasWidth / 2 - boundingRect.left - boundingRect.width / 2));
    } else if (alignment === 'center-v') {
      obj.set('top', obj.top + (canvasHeight / 2 - boundingRect.top - boundingRect.height / 2));
    } else if (alignment === 'center') {
      obj.set('left', obj.left + (canvasWidth / 2 - boundingRect.left - boundingRect.width / 2));
      obj.set('top', obj.top + (canvasHeight / 2 - boundingRect.top - boundingRect.height / 2));
    }

    obj.setCoords();
    this.canvas.requestRenderAll();
    this.savePageState();
  }

  updateTransformPropsFromObject(obj: any) {
    if (!obj) return;
    const width = obj.getScaledWidth();
    const height = obj.getScaledHeight();
    this.transformProps = {
      widthPercent: Math.round((width / this.docWidth) * 100),
      heightPercent: Math.round((height / this.docHeight) * 100),
      widthPx: Math.round(width),
      heightPx: Math.round(height),
      angle: Math.round(obj.angle || 0),
      usePx: this.transformProps.usePx, // preserve current toggle state
      lockAspect: this.transformProps.lockAspect // preserve current toggle state
    };
  }

  updateTransformProp(prop: string, value: number) {
    const obj = this.canvas.getActiveObject();
    if (!obj) return;

    const originalWidth = obj.getScaledWidth();
    const originalHeight = obj.getScaledHeight();
    const aspectRatio = originalWidth / originalHeight;

    let targetWidth = originalWidth;
    let targetHeight = originalHeight;

    if (prop === 'widthPercent') {
      targetWidth = (value / 100) * this.docWidth;
      if (this.transformProps.lockAspect) targetHeight = targetWidth / aspectRatio;
    } else if (prop === 'heightPercent') {
      targetHeight = (value / 100) * this.docHeight;
      if (this.transformProps.lockAspect) targetWidth = targetHeight * aspectRatio;
    } else if (prop === 'widthPx') {
      targetWidth = value;
      if (this.transformProps.lockAspect) targetHeight = targetWidth / aspectRatio;
    } else if (prop === 'heightPx') {
      targetHeight = value;
      if (this.transformProps.lockAspect) targetWidth = targetHeight * aspectRatio;
    } else if (prop === 'angle') {
      obj.set('angle', value);
    }

    if (prop.startsWith('width') || prop.startsWith('height')) {
      obj.set({ scaleX: targetWidth / obj.width!, scaleY: targetHeight / obj.height! });
      // Update the other props to stay in sync
      this.updateTransformPropsFromObject(obj);
    }

    obj.setCoords();
    this.canvas.requestRenderAll();
    this.savePageState();
  }

  applyAdvancedShadow() {
    const obj = this.canvas.getActiveObject() as any;
    if (obj && this.commonProps.hasShadow) {
      if (this.shadowProps.type === 'glow') {
        obj.set('shadow', new fabric.Shadow({
          color: this.shadowProps.color,
          blur: this.shadowProps.blur,
          offsetX: 0,
          offsetY: 0
        }));
      } else {
        obj.set('shadow', new fabric.Shadow({
          color: this.shadowProps.color,
          blur: this.shadowProps.blur,
          offsetX: this.shadowProps.offsetX,
          offsetY: this.shadowProps.offsetY
        }));
      }
      this.canvas.requestRenderAll();
      this.savePageState();
    }
  }

  toggleShadow(hasShadow: boolean) {
    this.commonProps.hasShadow = hasShadow;
    const obj = this.canvas.getActiveObject() as any;
    if (obj) {
      if (hasShadow) {
        this.applyAdvancedShadow();
      } else {
        obj.set('shadow', null);
        this.canvas.requestRenderAll();
        this.savePageState();
      }
    }
  }

  // --- Pages ---
  savePageState() {
    if (!this.canvas) return;
    const obj = this.canvas.toObject(['name', 'selectable', 'evented', 'lockMovementX', 'lockMovementY', 'lockRotation', 'lockScalingX', 'lockScalingY', 'id', '_pathLength', 'isVideo', 'videoSrc']);
    
    // Replace src for video objects with a 1x1 transparent PNG to prevent Fabric's loadFromJSON from failing on video files
    if (obj && obj.objects) {
      obj.objects.forEach((o: any) => {
        if (o.isVideo) {
          o.src = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
        }
      });
    }
    
    this.pages[this.currentPageIndex] = JSON.stringify(obj);
  }

  async addNewPage() {
    this.savePageState();
    this.pages.push('');
    await this.switchPage(this.pages.length - 1);
  }

  async switchPage(index: number) {
    this.savePageState(); // save current before switching
    this.currentPageIndex = index;
    const json = this.pages[index];
    if (json) {
      await this.canvas.loadFromJSON(json);
      await this.restoreVideoElements();
      this.canvas.requestRenderAll();
      this.updateLayers();
    } else {
      this.canvas.clear();
      this.canvas.backgroundColor = this.canvasBgColor;
      this.canvas.requestRenderAll();
      this.updateLayers();
    }
  }

  /** After loadFromJSON, scan for objects with isVideo flag and replace their source with a real <video> element */
  private async restoreVideoElements(): Promise<void> {
    const objects = this.canvas.getObjects();
    let hasVideo = false;
    for (const obj of objects) {
      const o = obj as any;
      if (o.isVideo && o.videoSrc) {
        hasVideo = true;
        const videoEl = document.createElement('video');
        videoEl.crossOrigin = 'anonymous';
        videoEl.muted = true;
        videoEl.loop = true;
        videoEl.src = o.videoSrc;
        videoEl.style.display = 'none';
        document.body.appendChild(videoEl);

        await new Promise<void>((resolve) => {
          videoEl.addEventListener('loadeddata', () => {
            videoEl.width = videoEl.videoWidth;
            videoEl.height = videoEl.videoHeight;
            videoEl.play();
            // Replace the image element with the video element
            (o as any).setElement(videoEl);
            o.set('objectCaching', false);
            o.set('dirty', true);
            resolve();
          });
          videoEl.addEventListener('error', () => {
            console.warn('Failed to restore video:', o.videoSrc);
            resolve();
          });
          videoEl.load();
        });
      }
    }
    if (hasVideo) {
      this.startVideoRenderLoop();
    }
  }

  /** Load a page directly WITHOUT saving the current canvas state first.
   *  Used when initially loading a document to avoid overwriting page data with empty canvas. */
  async loadPageDirect(index: number) {
    this.currentPageIndex = index;
    const json = this.pages[index];
    if (json) {
      await this.canvas.loadFromJSON(json);
      await this.restoreVideoElements();
      this.canvas.requestRenderAll();
      this.updateLayers();
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

  toggleDownloadMenu() {
    this.showDownloadMenu = !this.showDownloadMenu;
  }

  closeDownloadMenu() {
    this.showDownloadMenu = false;
  }

  downloadCurrentPagePNG() {
    this.closeDownloadMenu();
    const dataURL = this.canvas.toDataURL({ format: 'png', quality: 1, multiplier: 2 });
    const link = document.createElement('a');
    link.download = `${this.documentName}_page${this.currentPageIndex + 1}.png`;
    link.href = dataURL;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  downloadCurrentPagePDF() {
    this.closeDownloadMenu();
    const dataURL = this.canvas.toDataURL({ format: 'png', quality: 1, multiplier: 2 });
    const orientation = this.docWidth > this.docHeight ? 'landscape' : 'portrait';
    const pdf = new jsPDF({
      orientation,
      unit: 'px',
      format: [this.docWidth, this.docHeight],
      hotfixes: ['px_scaling']
    });
    pdf.addImage(dataURL, 'PNG', 0, 0, this.docWidth, this.docHeight);
    pdf.save(`${this.documentName}_page${this.currentPageIndex + 1}.pdf`);
  }

  async downloadAllPagesPNG() {
    this.closeDownloadMenu();
    this.savePageState();
    const originalPageIndex = this.currentPageIndex;

    const zip = new JSZip();

    for (let i = 0; i < this.pages.length; i++) {
      await this.loadPageForExport(i);
      const dataURL = this.canvas.toDataURL({ format: 'png', quality: 1, multiplier: 2 });
      // Extract base64 data from dataURL
      const base64Data = dataURL.split(',')[1];
      zip.file(`${this.documentName}_page${i + 1}.png`, base64Data, { base64: true });
    }

    // Generate ZIP and download
    const blob = await zip.generateAsync({ type: 'blob' });
    const link = document.createElement('a');
    link.download = `${this.documentName}_pages.zip`;
    link.href = URL.createObjectURL(blob);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);

    // Restore original page
    await this.loadPageForExport(originalPageIndex);
    this.currentPageIndex = originalPageIndex;
    this.updateLayers();
  }

  async downloadAllPagesPDF() {
    this.closeDownloadMenu();
    this.savePageState();
    const originalPageIndex = this.currentPageIndex;
    const orientation = this.docWidth > this.docHeight ? 'landscape' : 'portrait';

    const pdf = new jsPDF({
      orientation,
      unit: 'px',
      format: [this.docWidth, this.docHeight],
      hotfixes: ['px_scaling']
    });

    for (let i = 0; i < this.pages.length; i++) {
      if (i > 0) pdf.addPage([this.docWidth, this.docHeight], orientation);
      await this.loadPageForExport(i);
      const dataURL = this.canvas.toDataURL({ format: 'png', quality: 1, multiplier: 2 });
      pdf.addImage(dataURL, 'PNG', 0, 0, this.docWidth, this.docHeight);
    }

    pdf.save(`${this.documentName}.pdf`);

    // Restore original page
    await this.loadPageForExport(originalPageIndex);
    this.currentPageIndex = originalPageIndex;
    this.updateLayers();
  }

  private async loadPageForExport(index: number): Promise<void> {
    const json = this.pages[index];
    if (json) {
      await this.canvas.loadFromJSON(json);
      await this.restoreVideoElements();
      this.canvas.renderAll();
    } else {
      this.canvas.clear();
      this.canvas.backgroundColor = this.canvasBgColor;
      this.canvas.renderAll();
    }
    // Allow canvas to fully render before capturing
    await new Promise(r => setTimeout(r, 50));
  }

  async saveDocument() {
    this.isSaving = true;
    this.savePageState(); // Ensure current page is saved to this.pages array

    // Generate thumbnail always from page 1 (index 0)
    let thumbnailUrl = '';
    try {
      if (this.currentPageIndex === 0) {
        // Already on page 1, just capture
        thumbnailUrl = this.canvas.toDataURL({ format: 'png', quality: 0.4, multiplier: 0.25 });
      } else {
        // Temporarily load page 1 for thumbnail (loadPageForExport doesn't call savePageState)
        await this.loadPageForExport(0);
        thumbnailUrl = this.canvas.toDataURL({ format: 'png', quality: 0.4, multiplier: 0.25 });
        // Restore back to the current page
        await this.loadPageForExport(this.currentPageIndex);
        await this.restoreVideoElements();
        this.canvas.requestRenderAll();
        this.updateLayers();
      }
    } catch (e) {
      console.warn('Thumbnail generation failed', e);
    }

    const now = Date.now();
    const magazine: Magazine = {
      id: this.documentId || this.generateDocId(),
      title: this.documentName,
      createdAt: this.documentId ? (this.magazineService.getMagazine(this.documentId)?.createdAt || now) : now,
      updatedAt: now,
      settings: {
        width: this.docWidth,
        height: this.docHeight,
        unit: this.docUnit,
        canvasBgColor: this.canvasBgColor
      },
      pages: this.pages,
      thumbnailUrl
    };

    try {
      this.magazineService.saveMagazine(magazine);
    } catch (e: any) {
      console.error('Save failed:', e);
      if (e?.name === 'QuotaExceededError' || e?.code === 22) {
        alert('Save failed: Storage quota exceeded. Your design contains large images. Try using smaller images or image URLs instead of device uploads.');
      } else {
        alert('Save failed: ' + (e?.message || 'Unknown error'));
      }
      this.isSaving = false;
      this.cdr.detectChanges();
      return;
    }

    // If this was a new document, update URL without destroying the component
    if (!this.documentId) {
      this.documentId = magazine.id;
      this.location.replaceState('/edit/' + magazine.id);
    }

    this.isSaving = false;
    this.cdr.detectChanges();
  }

  private generateDocId(): string {
    return Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
  }

  help() {
    alert('Creative Editor Help: Use the sidebar to add elements. Drag to arrange. Use Layers panel to lock or hide objects.');
  }
}
