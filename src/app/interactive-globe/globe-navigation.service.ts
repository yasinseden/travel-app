import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

export interface LocationCoordinates {
  lat: number;
  lng: number;
  altitude?: number;
}

@Injectable({
  providedIn: 'root'
})
export class GlobeNavigationService {
  private focusLocationSource = new Subject<LocationCoordinates>();
  focusLocation$ = this.focusLocationSource.asObservable();

  flyTo(location: LocationCoordinates) {
    this.focusLocationSource.next(location);
  }
}
