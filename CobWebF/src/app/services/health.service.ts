import { HttpClient } from '@angular/common/http';
import { Service, inject, signal } from '@angular/core';
import { catchError, map, of, switchMap, timeout, timer } from 'rxjs';

import { API_URL } from '../api.config';

const POLL_INTERVAL_MS = 15000;
const REQUEST_TIMEOUT_MS = 5000;

@Service()
export class HealthService {
  private readonly http = inject(HttpClient);

  readonly online = signal<boolean | null>(null);

  constructor() {
    timer(0, POLL_INTERVAL_MS)
      .pipe(
        switchMap(() =>
          this.http.get(`${API_URL}/health`).pipe(
            timeout(REQUEST_TIMEOUT_MS),
            map(() => true),
            catchError(() => of(false)),
          ),
        ),
      )
      .subscribe((ok) => this.online.set(ok));
  }
}
