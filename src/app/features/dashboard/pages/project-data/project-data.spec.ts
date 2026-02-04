import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProjectData } from './project-data';

describe('ProjectData', () => {
  let component: ProjectData;
  let fixture: ComponentFixture<ProjectData>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProjectData]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ProjectData);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
