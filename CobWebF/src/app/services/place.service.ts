import { HttpClient } from '@angular/common/http';
import { Service, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { Place } from '../models/place.model';
import { Business } from '../models/business.model';
import { API_URL } from '../api.config';

@Service()
export class PlaceService {
  private readonly http = inject(HttpClient);

  getBusinesses(place: Place, radiusKm: number): Observable<Business[]> {
    return this.http.get<Business[]>(`${API_URL}/detection`, {
      params: { lat: place.lat, lon: place.lon, radiusKm },
    });
  }
}
