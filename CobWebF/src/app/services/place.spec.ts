import { TestBed } from '@angular/core/testing';
import { Place } from './place';

describe('Place', () => {
  let service: Place;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Place);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
