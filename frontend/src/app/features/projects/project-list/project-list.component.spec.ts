import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { of } from 'rxjs';
import { ConfirmationService, MessageService } from 'primeng/api';
import { AuthService } from '../../../core/services/auth.service';
import { MilestoneService } from '../../../core/services/milestone.service';
import { ProjectDocumentService } from '../../../core/services/project-document.service';
import { ProjectMeetingService } from '../../../core/services/project-meeting.service';
import { ProjectService } from '../../../core/services/project.service';
import { RiskService } from '../../../core/services';
import { UserService } from '../../../core/services/user.service';
import { ProjectListComponent } from './project-list.component';

describe('ProjectListComponent', () => {
  let component: ProjectListComponent;
  let fixture: ComponentFixture<ProjectListComponent>;
  const currentUser = { id: 1, role: 'ADMIN', firstName: 'Test', lastName: 'User', email: 'test.user@example.com' };

  const projectServiceMock = {
    getAllProjects: jasmine.createSpy('getAllProjects').and.returnValue(of([])),
    getProjectsByUser: jasmine.createSpy('getProjectsByUser').and.returnValue(of([])),
    getCustomers: jasmine.createSpy('getCustomers').and.returnValue(of([]))
  };

  const authServiceMock = {
    getCurrentUser: jasmine.createSpy('getCurrentUser').and.returnValue(currentUser)
  };

  const userServiceMock = {
    getAllUsersList: jasmine.createSpy('getAllUsersList').and.returnValue(of([]))
  };

  const projectDocumentServiceMock = {
    getByProject: jasmine.createSpy('getByProject').and.returnValue(of([]))
  };

  const projectMeetingServiceMock = {
    getByProject: jasmine.createSpy('getByProject').and.returnValue(of([])),
    getUpcomingByProject: jasmine.createSpy('getUpcomingByProject').and.returnValue(of([])),
    getPastByProject: jasmine.createSpy('getPastByProject').and.returnValue(of([]))
  };

  const milestoneServiceMock = {
    getByProject: jasmine.createSpy('getByProject').and.returnValue(of([]))
  };

  const riskServiceMock = {
    getRisksByProjectId: jasmine.createSpy('getRisksByProjectId').and.returnValue(of([]))
  };

  const messageServiceMock = {
    add: jasmine.createSpy('add')
  };

  const confirmationServiceMock = {
    confirm: jasmine.createSpy('confirm')
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ProjectListComponent],
      providers: [
        { provide: AuthService, useValue: authServiceMock },
        { provide: ProjectService, useValue: projectServiceMock },
        { provide: ProjectDocumentService, useValue: projectDocumentServiceMock },
        { provide: ProjectMeetingService, useValue: projectMeetingServiceMock },
        { provide: MilestoneService, useValue: milestoneServiceMock },
        { provide: RiskService, useValue: riskServiceMock },
        { provide: UserService, useValue: userServiceMock },
        { provide: MessageService, useValue: messageServiceMock },
        { provide: ConfirmationService, useValue: confirmationServiceMock }
      ],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();

    fixture = TestBed.createComponent(ProjectListComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should parse English summary sections into display sections', () => {
    component.projectSummary = `Overview: Project is on track.
Members: 2 active members.
Documents: 1 document.
Meetings: 1 upcoming meeting.
Milestones: 1 overdue milestone.
Alerts: 2 unread notifications.`;

    const sections = component.getProjectSummarySections();

    expect(sections.length).toBe(6);
    expect(sections[0]).toEqual({ title: 'Overview', content: 'Project is on track.' });
    expect(sections[5]).toEqual({ title: 'Alerts', content: '2 unread notifications.' });
  });

  it('should fallback to a single summary block when no sections are present', () => {
    component.projectSummary = 'Project is on track and ready for release.';

    const sections = component.getProjectSummarySections();

    expect(sections.length).toBe(1);
    expect(sections[0]).toEqual({ title: 'Summary', content: 'Project is on track and ready for release.' });
  });

  it('should insert the current marker between achieved and upcoming milestones', () => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    component.projectMilestones = [
      {
        id: 1,
        projectId: 1,
        title: 'Design approved',
        description: '',
        dueDate: yesterday.toISOString().split('T')[0],
        actualCompletionDate: yesterday.toISOString().split('T')[0],
        status: 'COMPLETED' as any,
        isCritical: true
      },
      {
        id: 2,
        projectId: 1,
        title: 'Release candidate',
        description: '',
        dueDate: tomorrow.toISOString().split('T')[0],
        status: 'PLANNED' as any,
        isCritical: false
      }
    ];

    const entries = component.getProjectMilestoneTimelineEntries();

    expect(entries.length).toBe(3);
    expect(entries[0].kind).toBe('milestone');
    expect(entries[0].kind === 'milestone' ? entries[0].state : '').toBe('achieved');
    expect(entries[1].kind).toBe('marker');
    expect(entries[1].kind === 'marker' ? entries[1].label : '').toContain('You are here');
    expect(entries[2].kind).toBe('milestone');
    expect(entries[2].kind === 'milestone' ? entries[2].state : '').toBe('upcoming');
  });

  it('should use the actual completion date when positioning completed milestones in the timeline', () => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    const later = new Date(today);
    later.setDate(today.getDate() + 10);

    component.projectMilestones = [
      {
        id: 1,
        projectId: 1,
        title: 'Finished early',
        description: '',
        dueDate: later.toISOString().split('T')[0],
        actualCompletionDate: yesterday.toISOString().split('T')[0],
        status: 'COMPLETED' as any,
        isCritical: false
      },
      {
        id: 2,
        projectId: 1,
        title: 'Coming next',
        description: '',
        dueDate: tomorrow.toISOString().split('T')[0],
        status: 'PLANNED' as any,
        isCritical: false
      }
    ];

    const entries = component.getProjectMilestoneTimelineEntries();

    expect(entries.length).toBe(3);
    expect(entries[0].kind).toBe('milestone');
    expect(entries[0].kind === 'milestone' ? entries[0].milestone.title : '').toBe('Finished early');
    expect(entries[1].kind).toBe('marker');
    expect(entries[2].kind).toBe('milestone');
    expect(entries[2].kind === 'milestone' ? entries[2].milestone.title : '').toBe('Coming next');
  });

  it('should compute milestone timeline stats', () => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    component.projectMilestones = [
      {
        id: 1,
        projectId: 1,
        title: 'Already done',
        description: '',
        dueDate: yesterday.toISOString().split('T')[0],
        actualCompletionDate: yesterday.toISOString().split('T')[0],
        status: 'COMPLETED' as any,
        isCritical: false
      },
      {
        id: 2,
        projectId: 1,
        title: 'Late task',
        description: '',
        dueDate: yesterday.toISOString().split('T')[0],
        status: 'PLANNED' as any,
        isCritical: false
      },
      {
        id: 3,
        projectId: 1,
        title: 'Next task',
        description: '',
        dueDate: tomorrow.toISOString().split('T')[0],
        status: 'IN_PROGRESS' as any,
        isCritical: false
      }
    ];

    const stats = component.getProjectMilestoneTimelineStats();

    expect(stats.total).toBe(3);
    expect(stats.achieved).toBe(1);
    expect(stats.overdue).toBe(1);
    expect(stats.upcoming).toBe(1);
  });
});

