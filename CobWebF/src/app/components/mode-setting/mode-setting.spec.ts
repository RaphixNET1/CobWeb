import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ModeSetting } from './mode-setting';

describe('ModeSetting', () => {
  let component: ModeSetting;
  let fixture: ComponentFixture<ModeSetting>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ModeSetting],
    }).compileComponents();

    fixture = TestBed.createComponent(ModeSetting);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
