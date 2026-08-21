import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import {
  IonIcon,
  IonRange,
  IonSpinner,
  IonSearchbar,
  RangeCustomEvent,
  SearchbarCustomEvent,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { closeCircle, locationOutline, navigateOutline } from 'ionicons/icons';
import { catchError, debounceTime, distinctUntilChanged, map, of, switchMap, tap } from 'rxjs';

import { Place } from '../../models/place.model';
import { GeocodingService } from '../../services/geocoding.service';

const SEARCH_DEBOUNCE_MS = 350;

@Component({
  selector: 'app-location-filter',
  templateUrl: './location-filter.component.html',
  styleUrls: ['./location-filter.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IonSearchbar, IonRange, IonIcon, IonSpinner],
})
export class LocationFilterComponent {
  private readonly geocoding = inject(GeocodingService);

  readonly radiusKm = input(50);
  readonly maxRadiusKm = input(100);

  /** The chosen search centre, or `null` when the field was cleared. */
  readonly placeSelected = output<Place | null>();
  readonly radiusChanged = output<number>();

  /** Name of the place currently used as the centre — drives the summary line. */
  readonly selectedName = signal<string | null>(null);
  readonly searching = signal(false);

  private readonly query = signal('');
  /** Hidden right after a pick so the list does not reopen over the result. */
  private readonly listOpen = signal(false);

  private readonly results = toSignal(
    toObservable(this.query).pipe(
      map((value) => value.trim()),
      debounceTime(SEARCH_DEBOUNCE_MS),
      distinctUntilChanged(),
      tap((term) => this.searching.set(term.length > 0)),
      switchMap((term) => this.geocoding.search(term).pipe(catchError(() => of([] as Place[])))),
      tap(() => this.searching.set(false)),
    ),
    { initialValue: [] as Place[] },
  );

  readonly suggestions = computed(() => (this.listOpen() ? this.results() : []));

  constructor() {
    addIcons({ locationOutline, navigateOutline, closeCircle });
  }

  onSearchInput(event: SearchbarCustomEvent): void {
    this.listOpen.set(true);
    this.query.set(event.detail.value ?? '');
  }

  select(place: Place): void {
    this.listOpen.set(false);
    this.searching.set(false);
    this.selectedName.set(place.name);
    this.placeSelected.emit(place);
  }

  clear(): void {
    this.listOpen.set(false);
    this.query.set('');
    this.selectedName.set(null);
    this.placeSelected.emit(null);
  }

  onRadiusInput(event: RangeCustomEvent): void {
    const value = event.detail.value;
    if (typeof value === 'number') {
      this.radiusChanged.emit(value);
    }
  }
}
