import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { MilestoneService, MilestoneStatus } from './milestone.service';
import { environment } from '../../../environments/environment';

describe('MilestoneService', () => {
  let service: MilestoneService;
  let httpMock: HttpTestingController;
  const apiUrl = `${environment.projectApiUrl}/milestones`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [MilestoneService]
    });

    service = TestBed.inject(MilestoneService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should translate frontend planned status to backend pending status when creating a milestone', () => {
    service.create({
      projectId: 10,
      title: 'Design review',
      description: 'Review the design',
      dueDate: '2026-04-30',
      status: MilestoneStatus.PLANNED,
      isCritical: false
    }).subscribe();

    const request = httpMock.expectOne(apiUrl);
    expect(request.request.method).toBe('POST');
    expect(request.request.body.status).toBe('PENDING');
    request.flush({
      id: 1,
      projectId: 10,
      title: 'Design review',
      description: 'Review the design',
      dueDate: '2026-04-30',
      status: 'PENDING',
      isCritical: false,
      actualCompletionDate: null
    });
  });

  it('should normalize backend achieved milestones to frontend completed milestones', () => {
    service.getById(7).subscribe((milestone) => {
      expect(milestone.status).toBe(MilestoneStatus.COMPLETED);
      expect(milestone.actualCompletionDate).toBe('2026-04-20');
      expect(milestone.completionDate).toBe('2026-04-20');
    });

    const request = httpMock.expectOne(`${apiUrl}/7`);
    expect(request.request.method).toBe('GET');
    request.flush({
      id: 7,
      projectId: 10,
      title: 'Implementation complete',
      description: 'Done',
      dueDate: '2026-04-25',
      status: 'ACHIEVED',
      isCritical: true,
      actualCompletionDate: '2026-04-20'
    });
  });
});

