import { ChangeDetectionStrategy, Component, signal } from '@angular/core';

import { LocationFilterComponent } from '../../components/location-filter/location-filter.component';
import { MapViewComponent } from '../../components/map-view/map-view.component';
import { Place } from '../../models/place.model';
import {NgOptimizedImage} from '@angular/common';

const DEFAULT_RADIUS_KM = 25;
const MAX_RADIUS_KM = 100;

@Component({
  selector: 'app-map-page',
  templateUrl: './map-page.html',
  styleUrl: './map-page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MapViewComponent, LocationFilterComponent, NgOptimizedImage],
})
export class MapPage {
  readonly maxRadiusKm = MAX_RADIUS_KM;

  readonly center = signal<Place | null>(null);
  readonly radiusKm = signal(DEFAULT_RADIUS_KM);
}
