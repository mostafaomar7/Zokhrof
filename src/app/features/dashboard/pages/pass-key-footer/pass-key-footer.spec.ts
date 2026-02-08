import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PassKeyFooter } from './pass-key-footer';

describe('PassKeyFooter', () => {
  let component: PassKeyFooter;
  let fixture: ComponentFixture<PassKeyFooter>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PassKeyFooter]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PassKeyFooter);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
