import { Component, Input, Output, EventEmitter, HostListener, ElementRef, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CanvasElement } from '../models/canvas-element.model';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-canvas-item',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './canvas-item.html',
  styleUrls: ['./canvas-item.scss'],
})
export class CanvasItem implements OnInit {
  @Input() element!: CanvasElement;
  @Input() isSelected: boolean = false;
  @Input() boardWidth: number = window.innerWidth;
  @Input() boardHeight: number = window.innerHeight;
  @Output() elementChange = new EventEmitter<CanvasElement>();
  @Output() selectItem = new EventEmitter<void>();
  @Output() remove = new EventEmitter<void>();

  isDragging = false;
  isResizing = false;
  isRotating = false;
  resizeHandle = '';

  startX = 0;
  startY = 0;
  startWidth = 0;
  startHeight = 0;
  startPosX = 0;
  startPosY = 0;

  centerX = 0;
  centerY = 0;
  startAngle = 0;
  startRotation = 0;

  fontFamilies = ['Playfair Display', 'Montserrat', 'Lora', 'Poppins', 'Inter', 'Cinzel'];
  padding = 80;

  constructor(private el: ElementRef) { }

  ngOnInit() {
  }

  onMouseDown(event: MouseEvent) {
    if ((event.target as HTMLElement).closest('.item-actions') ||
      (event.target as HTMLElement).closest('.text-toolbar') ||
      (event.target as HTMLElement).classList.contains('resize-handle')) {
      return;
    }
    this.selectItem.emit();
    event.stopPropagation();
  }

  onDragStart(event: MouseEvent) {
    this.selectItem.emit();
    this.isDragging = true;
    this.startX = event.clientX;
    this.startY = event.clientY;
    this.startPosX = this.element.x;
    this.startPosY = this.element.y;
    event.stopPropagation();
    event.preventDefault();
  }

  onResizeStart(event: MouseEvent, handle: string) {
    this.selectItem.emit();
    this.isResizing = true;
    this.resizeHandle = handle;
    this.startX = event.clientX;
    this.startY = event.clientY;
    this.startWidth = this.element.width;
    this.startHeight = this.element.height;
    this.startPosX = this.element.x;
    this.startPosY = this.element.y;
    event.stopPropagation();
    event.preventDefault();
  }

  onRotateStart(event: MouseEvent) {
    this.selectItem.emit();
    this.isRotating = true;

    // Get absolute center of element
    const rect = this.el.nativeElement.querySelector('.canvas-item-wrapper').getBoundingClientRect();
    this.centerX = rect.left + rect.width / 2;
    this.centerY = rect.top + rect.height / 2;

    // Calculate starting angle
    const dx = event.clientX - this.centerX;
    const dy = event.clientY - this.centerY;
    this.startAngle = Math.atan2(dy, dx);
    this.startRotation = this.element.rotation || 0;

    event.stopPropagation();
    event.preventDefault();
  }

  @HostListener('document:mousemove', ['$event'])
  onMouseMove(event: MouseEvent) {
    if (this.isDragging) {
      const dx = event.clientX - this.startX;
      const dy = event.clientY - this.startY;
      let newX = this.startPosX + dx;
      let newY = this.startPosY + dy;

      // Boundary Check
      const maxX = this.boardWidth - this.padding - this.element.width;
      const maxY = this.boardHeight - this.padding - this.element.height;

      this.element.x = Math.max(this.padding, Math.min(newX, maxX));
      this.element.y = Math.max(this.padding, Math.min(newY, maxY));

      this.emitChange();
    } else if (this.isResizing) {
      const dx = event.clientX - this.startX;
      const dy = event.clientY - this.startY;

      let newWidth = this.startWidth;
      let newHeight = this.startHeight;
      let newX = this.startPosX;
      let newY = this.startPosY;

      if (this.resizeHandle.includes('e')) newWidth = this.startWidth + dx;
      if (this.resizeHandle.includes('w')) {
        newWidth = this.startWidth - dx;
        newX = this.startPosX + dx;
      }
      if (this.resizeHandle.includes('s')) newHeight = this.startHeight + dy;
      if (this.resizeHandle.includes('n')) {
        newHeight = this.startHeight - dy;
        newY = this.startPosY + dy;
      }

      if (this.element.maintainAspectRatio) {
        const ratio = this.startWidth / this.startHeight;
        if (Math.abs(dx) > Math.abs(dy)) {
          newHeight = newWidth / ratio;
        } else {
          newWidth = newHeight * ratio;
        }
      }

      // Check width boundaries
      const maxWidth = this.boardWidth - newX - this.padding;
      const maxHeight = this.boardHeight - newY - this.padding;

      if (newWidth > 20 && newHeight > 20 && newWidth <= maxWidth && newHeight <= maxHeight && newX >= this.padding && newY >= this.padding) {
        this.element.width = newWidth;
        this.element.height = newHeight;
        if (!this.element.maintainAspectRatio || (this.resizeHandle.includes('w') || this.resizeHandle.includes('n'))) {
          if (this.resizeHandle.includes('w')) this.element.x = newX;
          if (this.resizeHandle.includes('n')) this.element.y = newY;
        }
        this.emitChange();
      }
    } else if (this.isRotating) {
      const dx = event.clientX - this.centerX;
      const dy = event.clientY - this.centerY;
      const currentAngle = Math.atan2(dy, dx);

      let angleDiff = currentAngle - this.startAngle;
      // Convert radians to degrees
      let degDiff = angleDiff * (180 / Math.PI);

      this.element.rotation = (this.startRotation + degDiff) % 360;
      this.emitChange();
    }
  }

  @HostListener('document:mouseup')
  onMouseUp() {
    if (this.isDragging || this.isResizing || this.isRotating) {
      this.isDragging = false;
      this.isResizing = false;
      this.isRotating = false;
      this.emitChange();
    }
  }

  emitChange() {
    this.elementChange.emit(this.element);
  }
}
