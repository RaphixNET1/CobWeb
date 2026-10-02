import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { Subscription, concat, concatMap, map, of, timer } from 'rxjs';

import { BusinessResultsComponent } from '../../components/business-results/business-results.component';
import { LocationFilterComponent } from '../../components/location-filter/location-filter.component';
import { MapViewComponent } from '../../components/map-view/map-view.component';
import { Business, DetectionProgress, SearchStatus } from '../../models/business.model';
import { Place } from '../../models/place.model';
import { PlaceService } from '../../services/place.service';

const DEFAULT_RADIUS_KM = 1;
const MAX_RADIUS_KM = 5;
const FINISH_DELAY_MS = 900;

@Component({
  selector: 'app-map-page',
  templateUrl: './map-page.html',
  styleUrl: './map-page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MapViewComponent, LocationFilterComponent, BusinessResultsComponent],
})
export class MapPage {
  private readonly placeService = inject(PlaceService);

  readonly maxRadiusKm = MAX_RADIUS_KM;

  readonly center = signal<Place | null>(null);
  readonly radiusKm = signal(DEFAULT_RADIUS_KM);

  readonly businesses = signal<Business[]>([]);
  readonly status = signal<SearchStatus>('idle');
  readonly progress = signal<DetectionProgress | null>(null);
  readonly finishing = signal(false);
  readonly selectedBusinessId = signal<string | null>(null);
  readonly searchedPlace = signal<Place | null>(null);
  readonly searchedRadiusKm = signal(DEFAULT_RADIUS_KM);

  private searchSub?: Subscription;

  constructor() {
    inject(DestroyRef).onDestroy(() => this.searchSub?.unsubscribe());
  }

  onPlaceSelected(place: Place | null): void {
    this.center.set(place);
    this.resetResults();
  }

  onRadiusChanged(radiusKm: number): void {
    this.radiusKm.set(radiusKm);
    this.resetResults();
  }

  search(): void {
    const center = this.center();
    if (!center) {
      return;
    }

    const radiusKm = this.radiusKm();
    this.searchSub?.unsubscribe();
    this.businesses.set([]);
    this.selectedBusinessId.set(null);
    this.searchedPlace.set(center);
    this.searchedRadiusKm.set(radiusKm);
    this.progress.set(null);
    this.finishing.set(false);
    this.status.set('loading');

    this.searchSub = this.placeService
      .detect(center, radiusKm)
      .pipe(
        concatMap((event) =>
          event.type === 'result'
            ? concat(
                of(event),
                timer(FINISH_DELAY_MS).pipe(map(() => ({ type: 'show' as const, businesses: event.businesses }))),
              )
            : of(event),
        ),
      )
      .subscribe({
        next: (event) => {
          switch (event.type) {
            case 'progress': {
              const { type, ...progress } = event;
              this.progress.set(progress);
              break;
            }
            case 'result':
              this.progress.update((progress) => progress && { ...progress, leads: event.businesses.length });
              this.finishing.set(true);
              break;
            case 'show':
              this.businesses.set(event.businesses);
              this.finishing.set(false);
              this.status.set('done');
              break;
          }
        },
        error: () => this.status.set('error'),
      });
  }

  selectBusiness(business: Business): void {
    this.selectedBusinessId.set(business.id);
  }

  resetResults(): void {
    this.searchSub?.unsubscribe();
    this.finishing.set(false);
    this.businesses.set([]);
    this.selectedBusinessId.set(null);
    this.status.set('idle');
  }
}
