import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EnterLogin } from './enter-login';

describe('EnterLogin', () => {
  let component: EnterLogin;
  let fixture: ComponentFixture<EnterLogin>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EnterLogin]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EnterLogin);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
