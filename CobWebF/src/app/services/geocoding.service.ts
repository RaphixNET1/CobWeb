import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map, of } from 'rxjs';
import { NominatimResult } from '../models/nominatimResult.model';

import { Place } from '../models/place.model';

const NOMINATIM_SEARCH_URL = 'https://nominatim.openstreetmap.org/search';

const MIN_QUERY_LENGTH = 3;


@Injectable({ providedIn: 'root' })
export class GeocodingService {
  private readonly http = inject(HttpClient);

  search(query: string, limit = 6): Observable<Place[]> {
    const term = query.trim();
    if (term.length < MIN_QUERY_LENGTH) {
      return of([]);
    }

    return this.http
      .get<NominatimResult[]>(NOMINATIM_SEARCH_URL, {
        params: { q: term, format: 'jsonv2', limit, 'accept-language': 'de' },
      })
      .pipe(map((results) => results.map(toPlace)));
  }
}

function toPlace(result: NominatimResult): Place {
  const [firstPart, ...rest] = result.display_name.split(',');

  return {
    id: String(result.place_id),
    name: result.name || firstPart.trim(),
    region: rest.join(',').trim(),
    lat: Number(result.lat),
    lon: Number(result.lon),
  };
}
