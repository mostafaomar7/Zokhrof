import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AfterPassKey } from './after-pass-key';

describe('AfterPassKey', () => {
  let component: AfterPassKey;
  let fixture: ComponentFixture<AfterPassKey>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AfterPassKey]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AfterPassKey);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
