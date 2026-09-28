import { HttpClient } from '@angular/common/http';
import { Service, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { Place } from '../models/place.model';
import { Business } from '../models/business.model';

const API_URL = 'https://localhost:7001/api';
@Service()
export class PlaceService {
  private readonly http = inject(HttpClient);

  getBusinesses(place: Place, radiusKm: number): Observable<Business[]> {
    return this.http.get<Business[]>(`${API_URL}/businesses`, {
      params: { lat: place.lat, lon: place.lon, radiusKm },
    });
  }
}
