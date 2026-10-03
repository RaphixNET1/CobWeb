import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  ViewEncapsulation,
  effect,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import * as L from 'leaflet';

import { Place } from '../../models/place.model';
import {
  Business,
  LeadStatus,
  formatDistance,
  issueLabel,
  statusLabel,
  websiteLabel,
} from '../../models/business.model';

const GERMANY_OVERVIEW: L.LatLngTuple = [47.6965, 13.3457];
const OVERVIEW_ZOOM = 7;

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

const LEAD_ICONS: Record<LeadStatus, L.DivIcon> = {
  noWebsite: leadIcon('map-pin--no-website'),
  socialOnly: leadIcon('map-pin--social-only'),
  outdated: leadIcon('map-pin--outdated'),
};

function leadIcon(modifier: string): L.DivIcon {
  return L.divIcon({
    className: `map-pin map-pin--business ${modifier}`,
    html: '<span class="map-pin__dot"></span>',
    iconSize: [14, 14],
    iconAnchor: [7, 7],
    popupAnchor: [0, -6],
  });
}

@Component({
  selector: 'app-map-view',
  templateUrl: './map-view.component.html',
  styleUrls: ['./map-view.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class MapViewComponent implements AfterViewInit, OnDestroy {
  readonly center = input<Place | null>(null);
  readonly radiusKm = input(0);
  readonly places = input<Place[]>([]);
  readonly businesses = input<Business[]>([]);
  readonly selectedBusinessId = input<string | null>(null);
  readonly scanning = input(false);

  readonly businessSelected = output<Business>();

  private readonly host = viewChild.required<ElementRef<HTMLElement>>('mapHost');

  private readonly ready = signal(false);

  private map?: L.Map;
  private centerMarker?: L.Marker;
  private radiusCircle?: L.Circle;
  private readonly placeLayer = L.layerGroup();
  private readonly businessLayer = L.layerGroup();
  private readonly businessMarkers = new Map<string, L.Marker>();
  private activeBusinessId: string | null = null;
  private resizeObserver?: ResizeObserver;

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
      this.center();
      this.radiusKm();
      const scanning = this.scanning();
      if (this.ready()) {
        this.radiusCircle?.getElement()?.classList.toggle('is-scanning', scanning);
      }
    });

    effect(() => {
      const places = this.places();
      if (this.ready()) {
        this.renderPlaces(places);
      }
    });

    effect(() => {
      const businesses = this.businesses();
      if (this.ready()) {
        this.renderBusinesses(businesses);
      }
    });

    effect(() => {
      const id = this.selectedBusinessId();
      if (this.ready()) {
        this.highlightBusiness(id);
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
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.map);

    L.control.zoom({ position: 'bottomright' }).addTo(this.map);
    this.placeLayer.addTo(this.map);
    this.businessLayer.addTo(this.map);

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
      className: 'radius-circle',
    }).addTo(map);

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

  private renderBusinesses(businesses: Business[]): void {
    this.businessLayer.clearLayers();
    this.businessMarkers.clear();
    this.activeBusinessId = null;

    // Keep popups clear of the filter (left) and results panel (right) - if the map is wide enough for that.
    const panelPad = (this.map?.getSize().x ?? 0) > 1000 ? 380 : 40;

    for (const [index, business] of businesses.entries()) {
      const marker = L.marker([business.lat, business.lon], { icon: LEAD_ICONS[business.status], title: business.name })
        .bindPopup(buildBusinessPopup(business), {
          autoPanPaddingTopLeft: [panelPad, 40],
          autoPanPaddingBottomRight: [panelPad, 40],
        })
        .on('click', () => this.businessSelected.emit(business))
        .addTo(this.businessLayer);
      // CWC
      marker.getElement()?.style.setProperty('--drop-delay', `${Math.min(index * 12, 700)}ms`);
      this.businessMarkers.set(business.id, marker);
    }
  }

  private highlightBusiness(id: string | null): void {
    if (id === this.activeBusinessId) {
      return;
    }

    const previous = this.activeBusinessId ? this.businessMarkers.get(this.activeBusinessId) : undefined;
    previous?.getElement()?.classList.remove('is-active');
    previous?.setZIndexOffset(0);

    this.activeBusinessId = id;
    const marker = id ? this.businessMarkers.get(id) : undefined;
    if (!marker) {
      return;
    }

    marker.getElement()?.classList.add('is-active');
    marker.setZIndexOffset(1000);
    if (!marker.isPopupOpen()) {
      marker.openPopup();
    }
  }
}

function buildBusinessPopup(business: Business): HTMLElement {
  const wrapper = document.createElement('div');
  wrapper.className = 'map-popup';

  const category = document.createElement('span');
  category.className = 'map-popup__category';
  category.textContent = `${business.category} · Score ${business.score}`;

  const title = document.createElement('span');
  title.className = 'map-popup__title';
  title.textContent = business.name;
  wrapper.append(category, title);

  if (business.address) {
    const address = document.createElement('span');
    address.className = 'map-popup__region';
    address.textContent = business.address;
    wrapper.append(address);
  }

  const badges = document.createElement('span');
  badges.className = 'map-popup__badges';
  const labels = business.status === 'outdated'
    ? business.issues.map(issueLabel)
    : [statusLabel(business.status)];
  for (const label of labels) {
    const badge = document.createElement('span');
    badge.className = 'map-popup__badge';
    badge.textContent = label;
    badges.append(badge);
  }
  wrapper.append(badges);

  if (business.website) {
    const link = document.createElement('a');
    link.className = 'map-popup__link';
    link.href = business.website;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.textContent = websiteLabel(business.website);
    wrapper.append(link);
  }

  if (business.phone) {
    const phone = document.createElement('a');
    phone.className = 'map-popup__link';
    phone.href = `tel:${business.phone}`;
    phone.textContent = business.phone;
    wrapper.append(phone);
  }

  const distance = document.createElement('span');
  distance.className = 'map-popup__distance';
  distance.textContent = `${formatDistance(business.distanceKm)} away`;
  wrapper.append(distance);

  return wrapper;
}

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
    distance.textContent = `${place.distanceKm.toFixed(1)} km away`;
    wrapper.append(distance);
  }

  return wrapper;
}
