import { Component, ElementRef, ViewChild, AfterViewInit, OnDestroy } from '@angular/core';
import CreativeEditorSDK from '@cesdk/cesdk-js';
import { initDesignEditor } from '../imgly';

@Component({
  selector: 'app-img.ly-canvas-editor',
  standalone: true,
  template: `
    <div #editorContainer style="width: 100vw; height: 100vh;"></div>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
      height: 100%;
    }
  `]
})
export class ImgLyCanvasEditor implements AfterViewInit, OnDestroy {
  @ViewChild('editorContainer') editorContainer!: ElementRef<HTMLDivElement>;
  private cesdk?: CreativeEditorSDK;

  async ngAfterViewInit() {
    console.log('Manual Initialization Started');
    
    const config = {
      baseURL: `https://cdn.img.ly/packages/imgly/cesdk-js/${CreativeEditorSDK.version}/assets`,
      callbacks: {
        onUpload: 'local' as const
      },
      // UI elementlerini zorla aktif etmek için boş bir nesne yerine v5 standartlarını kullanalım
      ui: {
        elements: {
          navigation: {
            action: {
              export: true
            }
          }
        }
      }
    };

    try {
      this.cesdk = await CreativeEditorSDK.create(this.editorContainer.nativeElement, config);
      await initDesignEditor(this.cesdk);
      await this.cesdk.actions.run('scene.create', { mode: 'Design' });
    } catch (error) {
      console.error('Initialization failed:', error);
    }
  }

  ngOnDestroy() {
    if (this.cesdk) {
      this.cesdk.dispose();
    }
  }
}
