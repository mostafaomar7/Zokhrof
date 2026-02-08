import { TestBed } from '@angular/core/testing';

import { Keys } from './keys';

describe('Keys', () => {
  let service: Keys;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Keys);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
