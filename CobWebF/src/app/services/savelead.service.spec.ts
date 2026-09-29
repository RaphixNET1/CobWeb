import { TestBed } from '@angular/core/testing';
import { SaveleadService } from './savelead.service';

describe('SaveleadService', () => {
  let service: SaveleadService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SaveleadService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
