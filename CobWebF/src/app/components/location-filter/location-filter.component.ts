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
import { catchError, debounceTime, distinctUntilChanged, map, of, switchMap, tap } from 'rxjs';
import { LucideAngularModule, MapPin, Navigation, XCircle } from "lucide-angular";

import { Place } from '../../models/place.model';
import { GeocodingService } from '../../services/geocoding.service';

const SEARCH_DEBOUNCE_MS = 350;

@Component({
  selector: 'app-location-filter',
  templateUrl: './location-filter.component.html',
  styleUrls: ['./location-filter.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [LucideAngularModule],
})
export class LocationFilterComponent {
  private readonly geocoding = inject(GeocodingService);

  protected readonly MapPin = MapPin;
  protected readonly Navigation = Navigation;
  protected readonly XCircle = XCircle;

  readonly radiusKm = input(1);
  readonly maxRadiusKm = input(5);

  readonly placeSelected = output<Place | null>();
  readonly radiusChanged = output<number>();

  readonly selectedName = signal<string | null>(null);
  readonly searching = signal(false);

  private readonly query = signal('');
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

  onSearchInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    if (!value.trim()) {
      this.clear();
    }
  }

  onSearchSubmit(value: string): void {
    this.listOpen.set(true);
    this.query.set(value);
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

  onRadiusInput(event: Event): void {
    const value = Number((event.target as HTMLInputElement).value);
    this.radiusChanged.emit(value);
  }
}
