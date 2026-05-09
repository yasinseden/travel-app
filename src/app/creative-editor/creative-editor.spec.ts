import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CreativeEditor } from './creative-editor';

describe('CreativeEditor', () => {
  let component: CreativeEditor;
  let fixture: ComponentFixture<CreativeEditor>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CreativeEditor],
    }).compileComponents();

    fixture = TestBed.createComponent(CreativeEditor);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
