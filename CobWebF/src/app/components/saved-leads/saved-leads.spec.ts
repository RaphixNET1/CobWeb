import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SavedLeads } from './saved-leads';

describe('SavedLeads', () => {
  let component: SavedLeads;
  let fixture: ComponentFixture<SavedLeads>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SavedLeads],
    }).compileComponents();

    fixture = TestBed.createComponent(SavedLeads);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
