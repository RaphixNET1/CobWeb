import { HttpClient } from '@angular/common/http';
import { Service, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { Place } from '../models/place.model';
import { Business, DetectionEvent } from '../models/business.model';
import { API_URL } from '../api.config';

@Service()
export class PlaceService {
  private readonly http = inject(HttpClient);

  getBusinesses(place: Place, radiusKm: number): Observable<Business[]> {
    return this.http.get<Business[]>(`${API_URL}/detection`, {
      params: { lat: place.lat, lon: place.lon, radiusKm },
    });
  }

  detect(place: Place, radiusKm: number): Observable<DetectionEvent> {
    const params = new URLSearchParams({
      lat: String(place.lat),
      lon: String(place.lon),
      radiusKm: String(radiusKm),
    });

    return new Observable<DetectionEvent>((subscriber) => {
      const source = new EventSource(`${API_URL}/detection/stream?${params}`);

      source.addEventListener('progress', (event) => {
        subscriber.next({ type: 'progress', ...JSON.parse((event as MessageEvent).data) });
      });

      source.addEventListener('result', (event) => {
        source.close();
        subscriber.next({ type: 'result', businesses: JSON.parse((event as MessageEvent).data) });
        subscriber.complete();
      });

      source.addEventListener('failed', () => {
        source.close();
        subscriber.error(new Error('Detection failed'));
      });

      source.onerror = () => {
        source.close();
        subscriber.error(new Error('Detection stream closed'));
      };

      return () => source.close();
    });
  }
}
