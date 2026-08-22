import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import {IonButtons, IonContent, IonHeader, IonTitle, IonToolbar} from '@ionic/angular';

import { LocationFilterComponent } from '../components/location-filter/location-filter.component';
import { MapViewComponent } from '../components/map-view/map-view.component';
import { Place, distanceInKm } from '../models/place.model';

const DEFAULT_RADIUS_KM = 25;
const MAX_RADIUS_KM = 100;

@Component({
  selector: 'app-tab1',
  templateUrl: 'tab1.page.html',
  styleUrls: ['tab1.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IonHeader, IonToolbar, IonTitle, IonContent, MapViewComponent, LocationFilterComponent, IonButtons],
})
export class Tab1Page {
  readonly maxRadiusKm = MAX_RADIUS_KM;

  readonly center = signal<Place | null>(null);
  readonly radiusKm = signal(DEFAULT_RADIUS_KM);

  /*readonly placesInRadius = computed<Place[]>(() => {
    const center = this.center();
    if (!center) {
      return [];
    }

    const radiusKm = this.radiusKm();

  });*/
}
