import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AfterPassKeyManagement } from './after-pass-key-management';

describe('AfterPassKeyManagement', () => {
  let component: AfterPassKeyManagement;
  let fixture: ComponentFixture<AfterPassKeyManagement>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AfterPassKeyManagement]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AfterPassKeyManagement);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
