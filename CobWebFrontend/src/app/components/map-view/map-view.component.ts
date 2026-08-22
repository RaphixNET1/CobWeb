import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  ViewEncapsulation,
  effect,
  input,
  signal,
  viewChild,
} from '@angular/core';
import * as L from 'leaflet';

import { Place } from '../../models/place.model';

const GERMANY_OVERVIEW: L.LatLngTuple = [47.6965, 13.3457];
const OVERVIEW_ZOOM = 7;

/** Leaflet builds these nodes itself, so they carry no Angular encapsulation attribute. */
const CENTER_ICON = L.divIcon({
  className: 'map-pin map-pin--center',
  html: '<span class="map-pin__pulse"></span><span class="map-pin__dot"></span>',
  iconSize: [22, 22],
  iconAnchor: [11, 11],
});

const PLACE_ICON = L.divIcon({
  className: 'map-pin map-pin--place',
  html: '<span class="map-pin__dot"></span>',
  iconSize: [14, 14],
  iconAnchor: [7, 7],
});

@Component({
  selector: 'app-map-view',
  templateUrl: './map-view.component.html',
  styleUrls: ['./map-view.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  // The pins and popups above live outside the compiled template, so their styles
  // have to be global. All selectors in the stylesheet are namespaced accordingly.
  encapsulation: ViewEncapsulation.None,
})
export class MapViewComponent implements AfterViewInit, OnDestroy {
  /** Centre of the search radius; `null` shows the untargeted overview map. */
  readonly center = input<Place | null>(null);
  readonly radiusKm = input(0);
  /** Places to pin, already filtered to the radius by the caller. */
  readonly places = input<Place[]>([]);

  private readonly host = viewChild.required<ElementRef<HTMLElement>>('mapHost');

  /** Gate for the render effects — signals may settle before the view exists. */
  private readonly ready = signal(false);

  private map?: L.Map;
  private centerMarker?: L.Marker;
  private radiusCircle?: L.Circle;
  private readonly placeLayer = L.layerGroup();
  private resizeObserver?: ResizeObserver;

  /** Distinguishes "moved to a new place" from "dragged the radius slider". */
  private lastCenterId: string | null = null;

  constructor() {
    effect(() => {
      const center = this.center();
      const radiusKm = this.radiusKm();
      if (this.ready()) {
        this.renderCenter(center, radiusKm);
      }
    });

    effect(() => {
      const places = this.places();
      if (this.ready()) {
        this.renderPlaces(places);
      }
    });
  }

  ngAfterViewInit(): void {
    const element = this.host().nativeElement;

    this.map = L.map(element, { zoomControl: false, attributionControl: true }).setView(
      GERMANY_OVERVIEW,
      OVERVIEW_ZOOM,
    );

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.map);

    L.control.zoom({ position: 'bottomright' }).addTo(this.map);
    this.placeLayer.addTo(this.map);

    // Ionic keeps inactive tabs in the DOM at zero size, so the map is usually
    // measured wrong on creation. Re-measure whenever the host gets a real box.
    this.resizeObserver = new ResizeObserver(() => this.map?.invalidateSize());
    this.resizeObserver.observe(element);

    this.ready.set(true);
  }

  ngOnDestroy(): void {
    this.resizeObserver?.disconnect();
    this.map?.remove();
  }

  private renderCenter(center: Place | null, radiusKm: number): void {
    const map = this.map;
    if (!map) {
      return;
    }

    this.centerMarker?.remove();
    this.radiusCircle?.remove();
    this.centerMarker = undefined;
    this.radiusCircle = undefined;

    if (!center) {
      // Only pull back to the overview if we had actually zoomed in on something;
      // otherwise this would re-run the initial setView on every startup.
      if (this.lastCenterId !== null) {
        this.lastCenterId = null;
        map.setView(GERMANY_OVERVIEW, OVERVIEW_ZOOM, { animate: true });
      }
      return;
    }

    const isNewCenter = center.id !== this.lastCenterId;
    this.lastCenterId = center.id;

    const latLng: L.LatLngTuple = [center.lat, center.lon];
    this.centerMarker = L.marker(latLng, { icon: CENTER_ICON, keyboard: false })
      .bindPopup(buildPopup(center))
      .addTo(map);

    if (radiusKm <= 0) {
      map.setView(latLng, 13, { animate: isNewCenter });
      return;
    }

    this.radiusCircle = L.circle(latLng, {
      radius: radiusKm * 1000,
      color: '#4f7cff',
      weight: 2,
      fillColor: '#4f7cff',
      fillOpacity: 0.12,
    }).addTo(map);

    // Leave room for the filter card floating over the top of the map.
    map.fitBounds(this.radiusCircle.getBounds(), {
      paddingTopLeft: [28, 200],
      paddingBottomRight: [28, 56],
      maxZoom: 15,
      animate: isNewCenter,
    });
  }

  private renderPlaces(places: Place[]): void {
    this.placeLayer.clearLayers();

    for (const place of places) {
      L.marker([place.lat, place.lon], { icon: PLACE_ICON })
        .bindPopup(buildPopup(place))
        .addTo(this.placeLayer);
    }
  }
}

/** Built as DOM rather than an HTML string — place names come from a remote API. */
function buildPopup(place: Place): HTMLElement {
  const wrapper = document.createElement('div');
  wrapper.className = 'map-popup';

  const title = document.createElement('span');
  title.className = 'map-popup__title';
  title.textContent = place.name;
  wrapper.append(title);

  if (place.region) {
    const region = document.createElement('span');
    region.className = 'map-popup__region';
    region.textContent = place.region;
    wrapper.append(region);
  }

  if (place.distanceKm !== undefined) {
    const distance = document.createElement('span');
    distance.className = 'map-popup__distance';
    distance.textContent = `${place.distanceKm.toFixed(1)} km entfernt`;
    wrapper.append(distance);
  }

  return wrapper;
}
