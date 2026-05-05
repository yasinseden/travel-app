import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CanvasItem } from './canvas-item';

describe('CanvasItem', () => {
  let component: CanvasItem;
  let fixture: ComponentFixture<CanvasItem>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CanvasItem],
    }).compileComponents();

    fixture = TestBed.createComponent(CanvasItem);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
