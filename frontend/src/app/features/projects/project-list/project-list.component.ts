import { Component, OnInit, OnDestroy } from '@angular/core';
import { ProjectService, Project } from '../../../core/services/project.service';
import { NotificationSyncService } from '../../../core/services/notification-sync.service';
import { AuthService } from '../../../core/services/auth.service';
import { ProjectDocumentService } from '../../../core/services/project-document.service';
import { ProjectMeetingService, ProjectMeeting } from '../../../core/services/project-meeting.service';
import { MilestoneService, Milestone, MilestoneStatus, MilestoneRequest } from '../../../core/services/milestone.service';
import { RiskService } from '../../../core/services/risk.service';
import { Risk } from '../../../core/models/risk.model';
import { ProjectDocument, ProjectDocumentForm, ProjectDocumentType } from '../../../core/models/project-document.model';
import { UserService } from '../../../core/services/user.service';
import { MessageService, ConfirmationService } from 'primeng/api';
import { Subject, finalize } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { Router } from '@angular/router';
import { TaskService } from '../../tasks/task.service';

type ProjectForm = Omit<Partial<Project>, 'startDate' | 'endDate' | 'actualEndDate'> & {
  startDate: Date | null;
  endDate: Date | null;
  actualEndDate?: Date | null;
};

type ProjectSummarySection = {
  title: string;
  content: string;
};

type MilestoneTimelineState = 'achieved' | 'current' | 'upcoming' | 'overdue' | 'cancelled';

type MilestoneTimelineEntry =
  | { kind: 'marker'; label: string }
  | { kind: 'milestone'; milestone: MilestoneLike; state: MilestoneTimelineState };

type MilestoneLike = Pick<Milestone, 'title' | 'description' | 'dueDate' | 'status' | 'isCritical'> &
  Partial<Pick<Milestone, 'completionDate' | 'actualCompletionDate' | 'createdAt' | 'updatedAt' | 'id' | 'projectId'>>;

type PendingMilestoneDraft = {
  title: string;
  description: string;
  dueDate: string;
  status: MilestoneStatus;
  isCritical: boolean;
};

@Component({
  selector: 'app-project-list',
  templateUrl: './project-list.component.html',
  styleUrl: './project-list.component.scss'
})
export class ProjectListComponent implements OnInit, OnDestroy {
  projects: Project[] = [];
  loading = false;
  selectedProject: Project | null = null;
  displayDetailDialog = false;
  displayCreateDialog = false;
  displayEditDialog = false;
  displayDeleteDialog = false;
  private destroy$ = new Subject<void>();

  // Date validation
  today = this.getStartOfDayDate();
  endDateMinDate = this.getTomorrowDate();

  searchTerm = '';
  statusFilter = '';
  statusOptions = [
    { label: 'All Status', value: '' },
    { label: 'Planned', value: 'PLANNED' },
    { label: 'In Progress', value: 'IN_PROGRESS' },
    { label: 'Completed', value: 'COMPLETED' },
    { label: 'On Hold', value: 'ON_HOLD' },
    { label: 'Cancelled', value: 'CANCELLED' }
  ];

  // Advanced search filters
  advancedSearchActive = false;
  advancedFilters = {
    name: '',
    status: '',
    description: '',
    customer: '' as any,
    createdBy: '',
    minProgress: null,
    maxProgress: null,
    startDateFrom: null,
    startDateTo: null,
    delayedOnly: false,
    sortBy: 'CREATED_DATE',
    sortDirection: 'DESC'
  };

  // Standard/General sort options that everyone knows
  sortOptions = [
    { label: '🕐 Most Recent First', value: 'CREATED_DATE' },
    { label: '🕐 Oldest First', value: 'CREATED_DATE_ASC' },
    { label: '📝 Project Name (A-Z)', value: 'NAME' },
    { label: '📝 Project Name (Z-A)', value: 'NAME_DESC' },
    { label: '⏳ Start Date (Earliest)', value: 'START_DATE' },
    { label: '⏳ Start Date (Latest)', value: 'START_DATE_DESC' },
    { label: '📊 Progress (Highest)', value: 'PROGRESS' },
    { label: '📊 Progress (Lowest)', value: 'PROGRESS_ASC' },
    { label: '🔄 Recently Updated', value: 'UPDATED_DATE' },
    { label: '⏱️ Status (A-Z)', value: 'STATUS' }
  ];

  sortDirectionOptions = [
    { label: '⬆️ Ascending', value: 'ASC' },
    { label: '⬇️ Descending', value: 'DESC' }
  ];

  newProject: ProjectForm = {
    name: '',
    description: '',
    objectives: '',
    startDate: this.getStartOfDayDate(),
    endDate: null,
    visibility: 'PRIVATE'
  };

  // Pagination
  currentPage = 1;
  itemsPerPage = 6;
  rowsPerPageOptions = [6, 10, 20, 30];
  paginatedProjects: Project[] = [];
  totalRecords = 0;

  // View mode management
  viewMode: 'grid' | 'list' = 'grid';

  // Slider progress value
  editProgressValue: number = 0;

  // Member management
  touchedFields: { [key: string]: boolean } = {};
  selectedNewMember: any = null;
  allUsers: any[] = [];
  allDirectoryUsers: any[] = [];
  filteredUsers: any[] = [];
  selectedUsersToAdd: any[] = [];
  memberFilters = {
    firstName: '',
    lastName: '',
    email: ''
  };
  projectMembersToAdd: any[] = [];
  editMemberFilters = {
    firstName: '',
    lastName: '',
    email: ''
  };
  editFilteredUsers: any[] = [];
  editSelectedUsersToAdd: any[] = [];
  editSelectedNewMember: any = null;

  // Customer selection
  selectedCustomer: any = null;
  allCustomers: any[] = [];
  filteredCustomers: any[] = [];

  // Document management
  projectDocuments: ProjectDocument[] = [];
  filteredProjectDocuments: ProjectDocument[] = [];
  documentSearchTerm = '';
  documentTypeFilter = '';
  editingDocumentId: number | null = null;
  pendingDocumentEditIndex: number | null = null;
  selectedDocumentFileName = '';
    pendingDocuments: ProjectDocumentForm[] = [];
    pendingMilestones: PendingMilestoneDraft[] = [];
    pendingMilestoneEditIndex: number | null = null;
    pendingMilestoneForm: any = {
    title: '',
    description: '',
    dueDate: '',
    status: MilestoneStatus.PENDING,
    isCritical: false
    };
    projectDocumentTypes: { label: string; value: ProjectDocumentType | '' }[] = [
    { label: 'All Types', value: '' },
    { label: 'Specifications', value: 'SPECIFICATIONS' },
    { label: 'Architecture', value: 'ARCHITECTURE' },
    { label: 'Design', value: 'DESIGN' },
    { label: 'Test plan', value: 'TEST_PLAN' },
    { label: 'Documentation', value: 'DOCUMENTATION' },
    { label: 'Release notes', value: 'RELEASE_NOTES' },
    { label: 'Other', value: 'OTHER' }
    ];
    projectDocumentTypeOptions = this.projectDocumentTypes.filter(option => option.value !== '');
    documentForm!: ProjectDocumentForm;

  // Meeting management
  projectMeetings: ProjectMeeting[] = [];
  upcomingProjectMeetings: ProjectMeeting[] = [];
  pastProjectMeetings: ProjectMeeting[] = [];
  calendarMeetings: ProjectMeeting[] = [];
  selectedMeetingCalendarDate: Date | null = this.getStartOfDayDate();
  meetingSearchTerm = '';
  meetingStatusFilter = '';
  displayMeetingDialog = false;
  meetingForm: any = {
    title: '',
    description: '',
    meetingDate: '',
    startTime: '',
    endTime: '',
    location: '',
    meetingLink: '',
    status: 'SCHEDULED'
  };
  editingMeetingId: number | null = null;

  // Milestone management
  projectMilestones: Milestone[] = [];
  displayMilestoneDialog = false;
  milestoneForm: any = {
    title: '',
    description: '',
    dueDate: '',
    status: MilestoneStatus.PENDING,
    actualCompletionDate: '',
    isCritical: false
  };
  editingMilestoneId: number | null = null;
  milestoneDialogProjectId: number | null = null;
    milestoneStatusOptions = [
    { label: 'Pending', value: MilestoneStatus.PENDING },
    { label: 'In Progress', value: MilestoneStatus.IN_PROGRESS },
    { label: 'Achieved', value: MilestoneStatus.ACHIEVED },
    { label: 'Missed', value: MilestoneStatus.MISSED },
    { label: 'Cancelled', value: MilestoneStatus.CANCELLED }
    ];

    isSubmittingMilestones = false;

    // Risk management

    markMilestoneAchieved(milestone: Milestone): void {
     if (!this.canManageProjectMilestones()) {
       this.messageService.add({ severity: 'warn', summary: 'Unauthorized', detail: 'Project members can only consult projects' });
       return;
     }
     const today = new Date().toISOString().split('T')[0];
     this.milestoneService.markAsAchieved(milestone.id, today)
       .pipe(takeUntil(this.destroy$))
       .subscribe({
         next: () => {
           this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Milestone marked as achieved' });
           this.loadProjectMilestones(this.selectedProject!.id);
         },
         error: (err: any) => {
           console.error('Error marking milestone achieved', err);
           this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to update milestone' });
         }
       });
    }

    // ============ MEETING MANAGEMENT ============

    loadProjectMeetings(projectId: number): void {
    this.projectMeetingService.getByProject(projectId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (meetings: ProjectMeeting[]) => {
          this.projectMeetings = this.sortMeetingsByDate(meetings || []);
          this.refreshMeetingCalendar();
        },
        error: (error: any) => {
          console.error('Error loading project meetings', error);
          this.projectMeetings = [];
          this.calendarMeetings = [];
        }
      });

    this.projectMeetingService.getUpcomingByProject(projectId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (meetings: ProjectMeeting[]) => {
          this.upcomingProjectMeetings = this.sortMeetingsByDate(meetings || []);
          this.refreshMeetingCalendar();
        },
        error: (error: any) => {
          console.error('Error loading upcoming project meetings', error);
          this.upcomingProjectMeetings = [];
        }
      });

    this.projectMeetingService.getPastByProject(projectId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (meetings: ProjectMeeting[]) => {
          this.pastProjectMeetings = this.sortMeetingsByDate(meetings || []);
        },
        error: (error: any) => {
          console.error('Error loading past project meetings', error);
          this.pastProjectMeetings = [];
        }
      });
    }

    openMeetingDialog(meeting?: ProjectMeeting): void {
    if (!this.canManageProjectMeetings()) {
      this.messageService.add({ severity: 'warn', summary: 'Unauthorized', detail: 'Project members can only consult projects' });
      return;
    }
    if (meeting) {
      this.editingMeetingId = meeting.id;
      this.meetingForm = {
        title: meeting.title,
        description: meeting.description,
        meetingDate: meeting.meetingDate,
        startTime: meeting.startTime,
        endTime: meeting.endTime,
        location: meeting.location,
        meetingLink: meeting.meetingLink,
        status: meeting.status
      };
    } else {
      this.editingMeetingId = null;
      this.meetingForm = {
        title: '',
        description: '',
        meetingDate: this.getTodayDateInputValue(),
        startTime: '10:00',
        endTime: '11:00',
        location: 'ONLINE',
        meetingLink: '',
        status: 'SCHEDULED'
      };
    }
    this.displayMeetingDialog = true;
    }

    saveMeeting(): void {
    if (!this.canManageProjectMeetings()) {
      this.messageService.add({ severity: 'warn', summary: 'Unauthorized', detail: 'Project members can only consult projects' });
      return;
    }
    if (!this.selectedProject || !this.meetingForm.title) {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Meeting title is required' });
      return;
    }

    const meetingDate = typeof this.meetingForm.meetingDate === 'string'
      ? this.meetingForm.meetingDate.trim()
      : '';

    if (!meetingDate) {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Meeting date is required' });
      return;
    }

    if (!this.editingMeetingId && meetingDate < this.getTodayDateInputValue()) {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Meeting date must be today or in the future' });
      return;
    }

    const currentUser = this.authService.getCurrentUser();

    // S'assurer que les dates et heures sont au format attendu (ISO ou HH:mm)
    const payload = {
      ...this.meetingForm,
      projectId: this.selectedProject.id,
      createdBy: currentUser?.email || 'system',
      status: this.meetingForm.status || 'SCHEDULED'
    };

    console.log('Sending meeting payload:', payload);

    if (this.editingMeetingId) {
      this.projectMeetingService.update(this.editingMeetingId, payload)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Meeting updated' });
            this.loadProjectMeetings(this.selectedProject!.id);
            this.displayMeetingDialog = false;
          },
          error: (err: any) => {
            console.error('Error updating meeting:', err);
            const errorMsg = err.error?.message || 'Failed to update meeting';
            this.messageService.add({ severity: 'error', summary: 'Error', detail: errorMsg });
          }
        });
    } else {
      this.projectMeetingService.create(payload)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Meeting scheduled' });
            this.loadProjectMeetings(this.selectedProject!.id);
            this.displayMeetingDialog = false;
          },
          error: (err: any) => {
            console.error('Error creating meeting:', err);
            const errorMsg = err.error?.message || 'Failed to schedule meeting';
            this.messageService.add({ severity: 'error', summary: 'Error', detail: errorMsg });
          }
        });
    }
    }

    deleteMeeting(meeting: ProjectMeeting): void {
    if (!this.canManageProjectMeetings()) {
      this.messageService.add({ severity: 'warn', summary: 'Unauthorized', detail: 'Project members can only consult projects' });
      return;
    }
    this.confirmationService.confirm({
      message: `Are you sure you want to delete the meeting "${meeting.title}"?`,
      header: 'Confirm Deletion',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        this.projectMeetingService.delete(meeting.id)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: () => {
              this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Meeting deleted' });
              if (this.selectedProject) {
                this.loadProjectMeetings(this.selectedProject.id);
              }
            },
            error: (err: any) => {
              console.error('Error deleting meeting', err);
              this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to delete meeting' });
            }
          });
      }
    });
    }

    getStatusMeetingSeverity(status: string): 'success' | 'info' | 'danger' | undefined {
    switch (status) {
      case 'COMPLETED': return 'success';
      case 'SCHEDULED': return 'info';
      case 'CANCELLED': return 'danger';
      default: return 'info';
    }
    }

    getFilteredMeetings(meetings: ProjectMeeting[]): ProjectMeeting[] {
    const term = this.meetingSearchTerm.trim().toLowerCase();
    const status = this.meetingStatusFilter.trim().toUpperCase();

    return meetings.filter(meeting => {
      const matchesStatus = !status || meeting.status?.toUpperCase() === status;
      if (!matchesStatus) {
        return false;
      }

      if (!term) {
        return true;
      }

      const searchable = [
        meeting.title,
        meeting.description,
        meeting.location,
        meeting.meetingLink,
        meeting.createdBy,
        meeting.status,
        meeting.meetingDate
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return searchable.includes(term);
    });
    }

    isTeamsMeeting(meeting: ProjectMeeting): boolean {
    return !!meeting.meetingLink && meeting.meetingLink.toLowerCase().includes('teams.microsoft.com');
    }

    getMeetingLinkLabel(meeting: ProjectMeeting): string {
    return this.isTeamsMeeting(meeting) ? 'Join Teams' : 'Open Link';
    }

    openMeetingLink(url?: string | null): void {
    if (!url) {
      return;
    }

    window.open(url, '_blank', 'noopener,noreferrer');
    }

    onMeetingCalendarDateChange(date: Date | null): void {
    this.selectedMeetingCalendarDate = date ? this.getStartOfDayDate(date) : null;
    this.refreshMeetingCalendar();
    }

    getMeetingTimeRange(meeting: ProjectMeeting): string {
    if (meeting.startTime && meeting.endTime) {
      return `${meeting.startTime} - ${meeting.endTime}`;
    }
    if (meeting.startTime) {
      return meeting.startTime;
    }
    return '-';
    }

    getMeetingLocationLabel(meeting: ProjectMeeting): string {
    if (this.isTeamsMeeting(meeting)) {
      return 'Microsoft Teams';
    }
    if (meeting.location === 'ONLINE') {
      return 'Online';
    }
    return meeting.location || '-';
    }

    getMeetingDateTime(meeting: ProjectMeeting): Date {
    const [year, month, day] = meeting.meetingDate.split('-').map(value => Number(value));
    const meetingDate = new Date(year, (month || 1) - 1, day || 1);

    if (meeting.startTime) {
      const [hours, minutes, seconds] = meeting.startTime.split(':').map(value => Number(value));
      meetingDate.setHours(hours || 0, minutes || 0, seconds || 0, 0);
    }

    return meetingDate;
    }

    private sortMeetingsByDate(meetings: ProjectMeeting[]): ProjectMeeting[] {
    return [...meetings].sort((left, right) => this.getMeetingDateTime(left).getTime() - this.getMeetingDateTime(right).getTime());
    }

    private refreshMeetingCalendar(): void {
    const selectedDate = this.selectedMeetingCalendarDate;

    if (!selectedDate) {
      this.calendarMeetings = [...this.upcomingProjectMeetings];
      return;
    }

    this.calendarMeetings = this.projectMeetings
      .filter(meeting => this.isSameCalendarDay(meeting.meetingDate, selectedDate))
      .sort((left, right) => this.getMeetingDateTime(left).getTime() - this.getMeetingDateTime(right).getTime());
    }

    getMeetingDateClass(date: any): string {
    const day = new Date(date.year, date.month, date.day);
    const hasMeeting = this.projectMeetings.some(m => this.isSameCalendarDay(m.meetingDate, day));

    if (hasMeeting) {
      const hasCompleted = this.projectMeetings.some(m => this.isSameCalendarDay(m.meetingDate, day) && m.status === 'COMPLETED');
      const hasCancelled = this.projectMeetings.some(m => this.isSameCalendarDay(m.meetingDate, day) && m.status === 'CANCELLED');

      if (hasCancelled) return 'meeting-day-cancelled';
      if (hasCompleted) return 'meeting-day-completed';
      return 'meeting-day-scheduled';
    }
    return '';
    }

    private isSameCalendarDay(dateValue: string | Date, selectedDate: Date | null): boolean {
    if (!selectedDate) {
      return false;
    }

    const meetingDate = dateValue instanceof Date ? dateValue : new Date(dateValue);
    return meetingDate.getFullYear() === selectedDate.getFullYear()
      && meetingDate.getMonth() === selectedDate.getMonth()
      && meetingDate.getDate() === selectedDate.getDate();
    }

    // ============ DOCUMENT MANAGEMENT ============
  projectRisks: Risk[] = [];

  // Notification management
  projectNotifications: any[] = [];
  emailSendingNotificationIds = new Set<number>();

  // AI Summary
  projectSummary = '';
  loadingSummary = false;
  private readonly projectSummarySectionTitles = ['Overview', 'Members', 'Documents', 'Meetings', 'Milestones', 'Alerts'];

  constructor(
    private projectService: ProjectService,
    private projectDocumentService: ProjectDocumentService,
    private projectMeetingService: ProjectMeetingService,
    private milestoneService: MilestoneService,
    private riskService: RiskService,
    public authService: AuthService,
    private userService: UserService,
    private messageService: MessageService,
    private confirmationService: ConfirmationService,
    private notificationSyncService: NotificationSyncService,
    private router: Router,
    private taskService: TaskService
  ) {
    this.documentForm = this.buildEmptyDocumentForm();
  }

  ngOnInit(): void {
    this.loadProjects();
    this.loadCustomers();
    this.loadUsers();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadProjects(): void {
    this.loading = true;
    const currentUser = this.authService.getCurrentUser();

    if (!currentUser) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'User not authenticated'
      });
      this.loading = false;
      return;
    }

    const projects$ = this.isAdminUser()
      ? this.projectService.getAllProjects()
      : this.projectService.getProjectsByUser(currentUser.id.toString());

    projects$
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.projects = data;
          this.totalRecords = data.length;
          this.updatePaginatedProjects();
          this.loading = false;
        },
        error: (error) => {
          console.error('Error loading projects', error);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to load projects'
          });
          this.loading = false;
        }
      });
  }

  performSearch(): void {
    const currentUser = this.authService.getCurrentUser();
    if (!this.searchTerm && !this.statusFilter) {
      this.loadProjects();
      return;
    }

    this.loading = true;
    this.projectService.searchProjects(this.searchTerm, this.statusFilter, currentUser && currentUser.id ? currentUser.id.toString() : undefined)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.projects = data;
          this.totalRecords = data.length;
          this.updatePaginatedProjects();
          this.loading = false;
        },
        error: (error) => {
          console.error('Error searching projects', error);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to search projects'
          });
          this.loading = false;
        }
      });
  }

  toggleAdvancedSearch(): void {
    this.advancedSearchActive = !this.advancedSearchActive;
    if (!this.advancedSearchActive) {
      this.resetAdvancedFilters();
    }
  }

  performAdvancedSearch(): void {
    const currentUser = this.authService.getCurrentUser();
    this.loading = true;
    const normalizedSort = this.normalizeAdvancedSearchSort(this.advancedFilters.sortBy, this.advancedFilters.sortDirection);
    const filters = {
      ...this.advancedFilters,
      customer: this.normalizeAdvancedSearchUserIdentifier(this.advancedFilters.customer),
      createdBy: this.normalizeAdvancedSearchUserIdentifier(this.advancedFilters.createdBy),
      minProgress: this.advancedFilters.minProgress != null ? this.advancedFilters.minProgress / 100 : null,
      maxProgress: this.advancedFilters.maxProgress != null ? this.advancedFilters.maxProgress / 100 : null,
      sortBy: normalizedSort.sortBy,
      sortDirection: normalizedSort.sortDirection
    };

    this.projectService.advancedSearchProjects(filters, currentUser && currentUser.id ? currentUser.id.toString() : undefined)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.projects = data;
          this.totalRecords = data.length;
          this.updatePaginatedProjects();
          this.loading = false;
          this.messageService.add({
            severity: 'success',
            summary: 'Success',
            detail: `Found ${data.length} project(s)`
          });
        },
        error: (error) => {
          console.error('Error searching projects', error);
          this.loading = false;
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to perform advanced search'
          });
        }
      });
  }

  resetAdvancedFilters(): void {
    this.advancedFilters = {
      name: '',
      status: '',
      description: '',
      customer: '' as any,
      createdBy: '',
      minProgress: null,
      maxProgress: null,
      startDateFrom: null,
      startDateTo: null,
      delayedOnly: false,
      sortBy: 'CREATED_DATE',
      sortDirection: 'DESC'
    };
    this.loadProjects();
  }

  private normalizeAdvancedSearchUserIdentifier(value: any): string | null {
    if (value == null) {
      return null;
    }

    if (typeof value === 'string') {
      const trimmed = value.trim();
      return trimmed || null;
    }

    if (typeof value === 'object') {
      const candidate = value.id ?? value.username ?? value.email ?? value.fullName ?? '';
      const normalized = String(candidate).trim();
      return normalized || null;
    }

    const normalized = String(value).trim();
    return normalized || null;
  }

  private normalizeAdvancedSearchSort(sortBy: any, sortDirection: any): { sortBy: string; sortDirection: 'ASC' | 'DESC' } {
    const requestedSort = (sortBy || 'CREATED_DATE').toString().trim().toUpperCase();
    const requestedDirection = (sortDirection || 'DESC').toString().trim().toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    switch (requestedSort) {
      case 'CREATED_DATE_ASC':
        return { sortBy: 'CREATED_DATE', sortDirection: 'ASC' };
      case 'NAME_DESC':
        return { sortBy: 'NAME', sortDirection: 'DESC' };
      case 'START_DATE_DESC':
        return { sortBy: 'START_DATE', sortDirection: 'DESC' };
      case 'PROGRESS_ASC':
        return { sortBy: 'PROGRESS', sortDirection: 'ASC' };
      case 'UPDATED_DATE':
        return { sortBy: 'CREATED_DATE', sortDirection: requestedDirection };
      case 'NAME':
      case 'PROGRESS':
      case 'STATUS':
      case 'START_DATE':
      case 'END_DATE':
      case 'CREATED_DATE':
        return { sortBy: requestedSort, sortDirection: requestedDirection };
      default:
        return { sortBy: 'CREATED_DATE', sortDirection: requestedDirection };
    }
  }

  onStatusFilterChange(): void {
    this.performSearch();
  }

  clearFilters(): void {
    this.searchTerm = '';
    this.statusFilter = '';
    this.loadProjects();
  }

  /**
   * Load customers from user service or mock data
   */
  loadCustomers(): void {
    this.userService.getAllUsersList()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (usersList: any[]) => {
          this.applyCustomerList(this.extractCustomers(usersList));

          if (this.allCustomers.length === 0) {
            this.loadCustomersFromProjectService();
          }
        },
        error: (error) => {
          console.error('Error loading customers from user service:', error);
          this.loadCustomersFromProjectService();
        }
      });
  }

  private loadCustomersFromProjectService(): void {
    this.projectService.getCustomers()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (usersList: any[]) => {
          this.applyCustomerList(this.extractCustomers(usersList));
        },
        error: (error) => {
          console.error('Error loading customers from project service:', error);
          this.allCustomers = [];
          this.filteredCustomers = [];
        }
      });
  }

  private extractCustomers(usersList: any[] = []): any[] {
    return (usersList || [])
      .filter((user: any) => this.isCustomerRole(user && user.role))
      .map((user: any) => {
        const firstName = (user.firstName || user.name || user.username || 'User').toString().trim();
        const lastName = (user.lastName || '').toString().trim();
        const fullName = `${firstName} ${lastName}`.trim();

        return {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
          firstName,
          lastName,
          avatar: user.avatarUrl || user.avatar,
          fullName
        };
      });
  }

  private applyCustomerList(customers: any[]): void {
    const safeCustomers = (customers || []).filter(customer => customer && customer.id != null);
    this.allCustomers = safeCustomers.sort((a, b) => this.getCustomerSortKey(a).localeCompare(this.getCustomerSortKey(b)));
    this.filteredCustomers = [...this.allCustomers];
    this.syncSelectedCustomer(this.selectedProject && this.selectedProject.customerId);
  }

  private getCustomerSortKey(customer: any): string {
    const fullName = customer && customer.fullName;
    const username = customer && customer.username;
    const email = customer && customer.email;
    const id = customer && customer.id;
    return (fullName || username || email || String(id || '')).toString();
  }

  private isCustomerRole(role: any): boolean {
    const normalized = (role || '').toString().trim().toUpperCase();
    return normalized === 'CUSTOMER' || normalized === 'CLIENT';
  }

  private isProjectAssignableRole(role: any): boolean {
    const normalized = (role || '').toString().trim().toUpperCase();
    return normalized === 'PROJECT_MANAGER' || normalized === 'PROJECT_MEMBER';
  }

  private isProjectAssignableUser(user: any): boolean {
    return !!user && this.isProjectAssignableRole(user.role);
  }

  public filterCustomers(event: any): void {
    const query = ((event && event.query) || '').toLowerCase();
    this.filteredCustomers = this.allCustomers.filter(customer =>
      this.getCustomerSortKey(customer).toLowerCase().includes(query) ||
      (customer.email || '').toString().toLowerCase().includes(query)
    );
    this.filteredCustomers.sort((a, b) => this.getCustomerSortKey(a).localeCompare(this.getCustomerSortKey(b)));
  }

  public onCustomerSelect(event: any): void {
    this.selectedCustomer = (event && event.value !== undefined) ? event.value : event;
    if (this.selectedCustomer && this.selectedCustomer.id != null) {
      this.selectedCustomer = this.allCustomers.find(customer => String(customer.id) === String(this.selectedCustomer.id)) || this.selectedCustomer;
    }
  }

  isCustomerSelected(customer: any): boolean {
    return !!customer && !!this.selectedCustomer && String(this.selectedCustomer.id) === String(customer.id);
  }

  toggleCustomerSelection(customer: any): void {
    if (!customer) return;
    this.selectedCustomer = this.isCustomerSelected(customer) ? null : customer;
  }

  clearSelectedCustomer(): void {
    this.selectedCustomer = null;
  }

  getSelectedCustomerName(): string {
    return this.selectedCustomer ? (this.selectedCustomer.fullName || this.selectedCustomer.username || this.selectedCustomer.email || 'Customer') : 'None';
  }

  /**
   * Load users from user service or mock data
   * Excludes the currently logged-in user
   */
  loadUsers(): void {
    const currentUser = this.authService.getCurrentUser();

    // Load users from backend using the /all endpoint (no pagination)
    this.userService.getAllUsersList()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (usersList: any[]) => {
          // Debug: log what we receive
          console.log('Users response:', usersList);

          // Convert to the format we need and filter out current user / non-project roles
          const mappedUsers = usersList
            .map((user: any) => {
              console.log('Processing user:', user);

              // Ensure firstName and lastName are always defined
              const firstName = (user.firstName || user.name || user.username || 'User').toString().trim();
              const lastName = (user.lastName || '').toString().trim();
              const fullName = `${firstName} ${lastName}`.trim();

              const mappedUser = {
                id: user.id,
                username: user.username,
                email: user.email,
                role: user.role,
                firstName: firstName,
                lastName: lastName,
                avatar: user.avatarUrl || user.avatar,
                fullName: fullName
              };

              console.log('Mapped user:', mappedUser);
              return mappedUser;
            });

          this.allDirectoryUsers = mappedUsers;
          this.allUsers = mappedUsers
            .filter((user: any) => user.id !== (currentUser && currentUser.id) && this.isProjectAssignableUser(user));

          console.log('All users after mapping:', this.allUsers);
          this.applyMemberFilters();
          this.applyEditMemberFilters();
        },
        error: (error) => {
          console.error('Error loading users:', error);
          // Fallback to empty list on error
          this.allUsers = [];
          this.allDirectoryUsers = [];
          this.filteredUsers = [];
          this.editFilteredUsers = [];
          this.messageService.add({
            severity: 'warn',
            summary: 'Warning',
            detail: 'Could not load users list from server'
          });
        }
      });
  }

  /**
   * Filter users based on search term (firstName, lastName, username, or email)
   */
  filterUsers(event: any): void {
    const query = event.query.toLowerCase();
    this.filteredUsers = this.allUsers.filter(user =>
      this.isProjectAssignableUser(user) && (
        user.firstName.toLowerCase().includes(query) ||
        user.lastName.toLowerCase().includes(query) ||
        user.username.toLowerCase().includes(query) ||
        user.email.toLowerCase().includes(query)
      )
    );
    // Sort by first name
    this.filteredUsers.sort((a, b) => a.firstName.localeCompare(b.firstName));
  }

  applyMemberFilters(): void {
    const firstName = this.memberFilters.firstName.trim().toLowerCase();
    const lastName = this.memberFilters.lastName.trim().toLowerCase();
    const email = this.memberFilters.email.trim().toLowerCase();

    this.filteredUsers = this.allUsers
      .filter(user => {
        if (!this.isProjectAssignableUser(user)) {
          return false;
        }
        if (this.isMemberAlreadyAdded(user)) {
          return false;
        }
        const matchesFirstName = !firstName || (user.firstName || '').toLowerCase().includes(firstName);
        const matchesLastName = !lastName || (user.lastName || '').toLowerCase().includes(lastName);
        const matchesEmail = !email || (user.email || '').toLowerCase().includes(email);
        return matchesFirstName && matchesLastName && matchesEmail;
      })
      .sort((a, b) => {
        const aName = `${a.firstName || ''} ${a.lastName || ''}`.trim().toLowerCase();
        const bName = `${b.firstName || ''} ${b.lastName || ''}`.trim().toLowerCase();
        return aName.localeCompare(bName);
      });
  }

  resetMemberFilters(): void {
    this.memberFilters = { firstName: '', lastName: '', email: '' };
    this.applyMemberFilters();
  }

  applyEditMemberFilters(): void {
    const firstName = this.editMemberFilters.firstName.trim().toLowerCase();
    const lastName = this.editMemberFilters.lastName.trim().toLowerCase();
    const email = this.editMemberFilters.email.trim().toLowerCase();

    this.editFilteredUsers = this.allUsers
      .filter(user => {
        if (!this.isProjectAssignableUser(user)) {
          return false;
        }
        if (this.isMemberAlreadyAdded(user)) {
          return false;
        }
        if (this.isUserAlreadyInProject(user)) {
          return false;
        }
        const matchesFirstName = !firstName || (user.firstName || '').toLowerCase().includes(firstName);
        const matchesLastName = !lastName || (user.lastName || '').toLowerCase().includes(lastName);
        const matchesEmail = !email || (user.email || '').toLowerCase().includes(email);
        return matchesFirstName && matchesLastName && matchesEmail;
      })
      .sort((a, b) => {
        const aName = `${a.firstName || ''} ${a.lastName || ''}`.trim().toLowerCase();
        const bName = `${b.firstName || ''} ${b.lastName || ''}`.trim().toLowerCase();
        return aName.localeCompare(bName);
      });
  }

  resetEditMemberFilters(): void {
    this.editMemberFilters = { firstName: '', lastName: '', email: '' };
    this.applyEditMemberFilters();
  }

  isUserAlreadyInProject(user: any): boolean {
    return !!(this.selectedProject && this.selectedProject.members && this.selectedProject.members.some(member => {
      const memberId = Number(member && member.userId);
      return Number(user && user.id) === memberId || this.getMemberEmail(member) === (user && user.email);
    }));
  }

  isEditUserSelected(user: any): boolean {
    return this.editSelectedUsersToAdd.some(selected => selected.id === user.id);
  }

  toggleEditUserSelection(user: any): void {
    if (!user || !this.isProjectAssignableUser(user)) {
      this.messageService.add({
        severity: 'info',
        summary: 'Info',
        detail: 'Only project managers and project members can be added'
      });
      return;
    }

    if (this.isUserAlreadyInProject(user)) {
      this.messageService.add({
        severity: 'info',
        summary: 'Info',
        detail: 'This user is already a member'
      });
      return;
    }

    if (this.isEditUserSelected(user)) {
      this.editSelectedUsersToAdd = this.editSelectedUsersToAdd.filter(selected => selected.id !== user.id);
      if (this.editSelectedNewMember && this.editSelectedNewMember.id === user.id) {
        this.editSelectedNewMember = this.editSelectedUsersToAdd.length > 0 ? this.editSelectedUsersToAdd[this.editSelectedUsersToAdd.length - 1] : null;
      }
      return;
    }

    this.editSelectedUsersToAdd = [...this.editSelectedUsersToAdd, user];
    this.editSelectedNewMember = user;
  }

  removeUserFromEditSelectionBuffer(user: any): void {
    this.editSelectedUsersToAdd = this.editSelectedUsersToAdd.filter(selected => selected.id !== user.id);
    if (this.editSelectedNewMember && this.editSelectedNewMember.id === user.id) {
      this.editSelectedNewMember = this.editSelectedUsersToAdd.length > 0 ? this.editSelectedUsersToAdd[this.editSelectedUsersToAdd.length - 1] : null;
    }
  }

  getMemberEmail(member: any): string {
    const userId = member && member.userId != null ? member.userId : (member && member.user && member.user.id != null ? member.user.id : (member && member.id));
    const currentUser = this.authService.getCurrentUser();
    const matchedUser = this.allUsers.find(user => String(user.id) === String(userId))
      || (currentUser && String(currentUser.id) === String(userId) ? currentUser : null);
    return (matchedUser && matchedUser.email) || (member && member.email) || (member && member.userEmail) || String(userId || '-');
  }

  getMemberDisplayName(member: any): string {
    const userId = member && member.userId != null ? member.userId : (member && member.user && member.user.id != null ? member.user.id : (member && member.id));
    const currentUser = this.authService.getCurrentUser();
    const matchedUser = this.allUsers.find(user => String(user.id) === String(userId))
      || (currentUser && String(currentUser.id) === String(userId) ? currentUser : null);
    if (matchedUser) {
      return this.getUserDisplayName(matchedUser);
    }
    const fallback = (member && member.fullName) || (member && member.name) || (member && member.email) || (member && member.userEmail) || '';
    return fallback || String(userId || 'User');
  }

  selectUserForMember(user: any): void {
    this.selectedNewMember = user;
    this.addUserToSelectionBuffer(user);
  }

  isUserSelectedForCreation(user: any): boolean {
    return this.selectedUsersToAdd.some(selected => selected.id === user.id);
  }

  isMemberAlreadyAdded(user: any): boolean {
    return this.projectMembersToAdd.some(member => member.id === user.id);
  }

  addUserToSelectionBuffer(user: any): void {
    if (!user || !this.isProjectAssignableUser(user) || this.isUserSelectedForCreation(user) || this.isMemberAlreadyAdded(user)) {
      this.selectedNewMember = user || this.selectedNewMember;
      return;
    }

    this.selectedUsersToAdd = [...this.selectedUsersToAdd, user];
    this.selectedNewMember = user;
  }

  removeUserFromSelectionBuffer(user: any): void {
    this.selectedUsersToAdd = this.selectedUsersToAdd.filter(selected => selected.id !== user.id);
    if (this.selectedNewMember?.id === user.id) {
      this.selectedNewMember = this.selectedUsersToAdd.length > 0 ? this.selectedUsersToAdd[this.selectedUsersToAdd.length - 1] : null;
    }
  }

  toggleUserSelection(user: any): void {
    if (!this.isProjectAssignableUser(user)) {
      this.messageService.add({
        severity: 'info',
        summary: 'Info',
        detail: 'Only project managers and project members can be added'
      });
      return;
    }

    if (this.isMemberAlreadyAdded(user)) {
      this.messageService.add({
        severity: 'info',
        summary: 'Info',
        detail: 'This user is already in the final members list'
      });
      return;
    }

    if (this.isUserSelectedForCreation(user)) {
      this.removeUserFromSelectionBuffer(user);
      return;
    }

    this.addUserToSelectionBuffer(user);
  }

  /**
   * Get display name for a user
   */
  getUserDisplayName(user: any): string {
    if (!user) return '';
    const firstName = user.firstName || user.name || user.username || '';
    const lastName = user.lastName || '';
    const fullName = `${firstName} ${lastName}`.trim();
    return fullName || user.username || user.email || 'User';
  }

  private findUserById(userId?: string | number | null): any | null {
    if (userId == null) return null;
    const normalizedUserId = String(userId);
    const currentUser = this.authService.getCurrentUser();
    return this.allUsers.find(user => String(user.id) === normalizedUserId)
      || (currentUser && String(currentUser.id) === normalizedUserId ? currentUser : null);
  }

  getProjectManagerDisplayName(project: Project): string {
    const managerId = project?.projectManagerId;
    if (!managerId) return 'undefined';
    const manager = this.findUserById(managerId);
    return manager ? this.getUserDisplayName(manager) : 'undefined';
  }

  getProjectCreatedByDisplayName(project: Project): string {
    const createdBy = project?.createdBy;
    const matchedUser = this.findUserByIdentifier(createdBy);
    if (matchedUser) {
      return this.getUserDisplayName(matchedUser);
    }

    const value = String(createdBy || '').trim();
    if (!value) {
      return '-';
    }

    if (/^\d+$/.test(value)) {
      return 'Unknown user';
    }

    return value;
  }

  getProjectCustomerDisplayName(project: Project): string {
    if (!project?.customerId) return 'undefined';
    return this.getCustomerDisplayName(project.customerId);
  }

  getProjectTeamSize(project: Project): number {
    if (!project?.members || project.members.length === 0) {
      return 0;
    }
    return project.members.filter(member => member?.isActive !== false).length;
  }

  getCustomerDisplayName(customerId?: string | null): string {
    if (!customerId) return '-';
    const matchedCustomer = this.allCustomers.find(customer => String(customer.id) === String(customerId));
    return matchedCustomer ? (matchedCustomer.fullName || matchedCustomer.email || String(matchedCustomer.id)) : String(customerId);
  }

  private syncSelectedCustomer(customerId?: string | null): void {
    if (!customerId) {
      this.selectedCustomer = null;
      return;
    }

    const matchedCustomer = this.allCustomers.find(customer => String(customer.id) === String(customerId));
    this.selectedCustomer = matchedCustomer || {
      id: customerId,
      username: customerId,
      email: customerId,
      firstName: customerId,
      lastName: '',
      fullName: String(customerId)
    };
  }

  /**
   * Handle member selection
   */
  onMemberSelect(event: any): void {
    this.selectedNewMember = (event && event.value !== undefined) ? event.value : event;
  }

  /**
   * Add member to the temporary list during project creation
   */
  addMemberToCreateForm(): void {
    const usersToAdd = this.selectedUsersToAdd.length > 0 ? [...this.selectedUsersToAdd] : (this.selectedNewMember ? [this.selectedNewMember] : []);

    if (usersToAdd.length === 0) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Please select at least one user'
      });
      return;
    }

    let addedCount = 0;
    let skippedCount = 0;

    usersToAdd.forEach((user) => {
      if (!this.isProjectAssignableUser(user)) {
        skippedCount++;
        return;
      }

      const exists = this.projectMembersToAdd.some(m => m.id === user.id);
      if (exists) {
        skippedCount++;
        return;
      }

      this.projectMembersToAdd.push({
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        username: user.username,
        email: user.email,
        fullName: user.fullName
      });
      addedCount++;
    });

    this.messageService.add({
      severity: addedCount > 0 ? 'success' : 'warning',
      summary: addedCount > 0 ? 'Success' : 'Warning',
      detail: addedCount > 0
        ? `${addedCount} member(s) added${skippedCount > 0 ? `, ${skippedCount} already existed` : ''}`
        : 'All selected users already exist in the members list'
    });

    // Reset selections
    this.selectedUsersToAdd = [];
    this.selectedNewMember = null;
  }

  /**
   * Remove member from the temporary list during project creation
   */
  removeMemberFromCreateForm(member: any): void {
    this.projectMembersToAdd = this.projectMembersToAdd.filter(m => m.id !== member.id);
    this.removeUserFromSelectionBuffer(member);
    this.messageService.add({
      severity: 'info',
      summary: 'Removed',
      detail: `${member.firstName} removed from members list`
    });
  }

  /**
   * Add members to the created project
   */
    public addMembersToCreatedProject(createdProject: any, membersToAdd: any[], onComplete: () => void): void {
     let membersAdded = 0;
     let membersTotal = membersToAdd.length;

     if (membersTotal === 0) {
       onComplete();
       return;
     }

     membersToAdd.forEach((member) => {
            this.projectService.addProjectMember(createdProject.id, member.email || member.userEmail || String(member.id))
         .pipe(takeUntil(this.destroy$))
         .subscribe({
           next: () => {
             membersAdded++;
             if (membersAdded === membersTotal) {
               onComplete();
             }
           },
           error: (error) => {
             console.error(`Error adding member ${member.firstName}:`, error);
             membersAdded++;
             if (membersAdded === membersTotal) {
               onComplete();
             }
           }
         });
     });
   }

  public addDocumentsToCreatedProject(createdProject: any, documentsToAdd: ProjectDocumentForm[], onComplete: () => void): void {
    let documentsAdded = 0;
    const documentsTotal = documentsToAdd.length;

    if (documentsTotal === 0) {
      onComplete();
      return;
    }

    documentsToAdd.forEach((document) => {
      const documentPayload = this.normalizeDocumentPayload(document);
      this.projectDocumentService.create(createdProject.id, documentPayload)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            documentsAdded++;
            if (documentsAdded === documentsTotal) {
              onComplete();
            }
          },
          error: (error) => {
            console.error('Error adding document to created project:', error);
            documentsAdded++;
            if (documentsAdded === documentsTotal) {
              onComplete();
            }
          }
        });
    });
  }

  /**
   * Complete project creation process
   */
    private completeProjectCreation(createdProject: any, membersCount: number = 0, documentsCount: number = 0, milestonesCount: number = 0): void {
    this.loading = false;
    this.displayCreateDialog = false;
    this.loadProjects();
    this.messageService.add({
      severity: 'success',
      summary: 'Project Created',
      detail: `Project "${createdProject.name}" created successfully with ${membersCount} members, ${documentsCount} documents and ${milestonesCount} milestones.`
    });
    }

  isProjectManager(project: Project): boolean {
    const currentUser = this.authService.getCurrentUser();
    return currentUser !== null && project.projectManagerId === currentUser.id.toString();
  }

  isCustomerUser(): boolean {
    const role = this.authService.getCurrentUser()?.role?.toString().trim().toUpperCase();
    return role === 'CUSTOMER' || role === 'CLIENT';
  }

  private isProjectManagerRoleUser(): boolean {
    const role = this.authService.getCurrentUser()?.role?.toString().trim().toUpperCase();
    return role === 'PROJECT_MANAGER' || role === 'MANAGER';
  }

  isAdminUser(): boolean {
    const role = this.authService.getCurrentUser()?.role?.toString().trim().toUpperCase();
    return role === 'ADMIN';
  }

  canCreateProjects(): boolean {
    return this.isAdminUser() || this.isProjectManagerRoleUser();
  }

  private canManageProjectsWorkspace(): boolean {
    return this.isAdminUser() || this.isProjectManagerRoleUser();
  }

  canEdit(project: Project): boolean {
    return this.isAdminUser() || (this.isProjectManagerRoleUser() && this.isProjectManager(project));
  }

  canDelete(project: Project): boolean {
    return (this.isAdminUser() || (this.isProjectManagerRoleUser() && this.isProjectManager(project))) && project.status !== 'COMPLETED';
  }

  canViewProjectDocuments(): boolean {
    return !!this.selectedProject;
  }

  canViewProjectMilestones(): boolean {
    return !!this.selectedProject;
  }

  canManageProjectDocuments(): boolean {
    return this.canManageProjectsWorkspace();
  }

  canViewProjectNotifications(): boolean {
    return !!this.selectedProject;
  }

  canManageProjectNotifications(): boolean {
    return this.canManageProjectsWorkspace();
  }

  canManageProjectMeetings(): boolean {
    return this.canManageProjectsWorkspace();
  }

  canManageProjectMilestones(): boolean {
    return this.canManageProjectsWorkspace();
  }

  formatDate(date: string | Date | null | undefined): string {
    if (!date) return '-';
    return new Date(date).toLocaleDateString();
  }

  getDocumentTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      SPECIFICATIONS: 'Specifications',
      ARCHITECTURE: 'Architecture',
      DESIGN: 'Design',
      TEST_PLAN: 'Test plan',
      DOCUMENTATION: 'Documentation',
      RELEASE_NOTES: 'Release notes',
      OTHER: 'Other'
    };
    return labels[type] || type;
  }

  private getStartOfDayDate(date: Date = new Date()): Date {
    const normalized = new Date(date);
    normalized.setHours(0, 0, 0, 0);
    return normalized;
  }

  private getTodayDateInputValue(date: Date = new Date()): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  getMeetingDateMinValue(): string {
    return this.getTodayDateInputValue();
  }

  getMilestoneDateMinValue(): string {
    return this.getTodayDateInputValue();
  }

  private getTomorrowDate(date: Date = new Date()): Date {
    const tomorrow = this.getStartOfDayDate(date);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow;
  }

  private toDateOnly(value: string | Date | null | undefined): Date | null {
    if (!value) return null;

    if (typeof value === 'string') {
      const trimmed = value.trim();
      const dateOnlyMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
      if (dateOnlyMatch) {
        const year = Number(dateOnlyMatch[1]);
        const month = Number(dateOnlyMatch[2]);
        const day = Number(dateOnlyMatch[3]);
        const localDate = new Date(year, month - 1, day);
        if (!isNaN(localDate.getTime())) {
          return this.getStartOfDayDate(localDate);
        }
      }
    }

    const date = value instanceof Date ? new Date(value) : new Date(value);
    if (isNaN(date.getTime())) return null;
    return this.getStartOfDayDate(date);
  }

  private formatDateForPayload(value: string | Date | null | undefined): string | undefined {
    const date = this.toDateOnly(value);
    if (!date) return undefined;

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private buildProjectPayload(): Partial<Project> {
    const { startDate, endDate, actualEndDate, ...rest } = this.newProject;
    const currentUser = this.authService.getCurrentUser();
    const customerId = this.isCustomerUser() ? currentUser?.id : this.selectedCustomer?.id;

    return {
      name: rest.name != null ? rest.name : '',
      description: rest.description != null ? rest.description : '',
      objectives: rest.objectives != null ? rest.objectives : '',
      startDate: this.formatDateForPayload(startDate) || '',
      endDate: this.formatDateForPayload(endDate) || '',
      actualEndDate: this.formatDateForPayload(actualEndDate) || undefined,
      progress: rest.progress != null ? rest.progress : 0,
      status: rest.status != null ? rest.status : 'PLANNED',
      visibility: rest.visibility != null ? rest.visibility : 'PRIVATE',
      ...(customerId != null ? { customerId: String(customerId) } : {})
    };
  }

  getStartDateAsDate(): Date | null {
    return this.toDateOnly(this.newProject.startDate);
  }

  getCreateEndDateMinDate(): Date {
    return this.endDateMinDate;
  }

  getEditStartDateMaxDate(): Date | undefined {
    return undefined;
  }

  getEditEndDateMinDate(): Date {
    const startDate = this.toDateOnly(this.newProject.startDate) || this.getStartOfDayDate();
    return startDate;
  }

  getEditActualEndDateMinDate(): Date {
    return this.toDateOnly(this.newProject.startDate) || this.getStartOfDayDate();
  }

  getEditActualEndDateMaxDate(): Date {
    return this.getStartOfDayDate();
  }

  private refreshEndDateMinDate(): void {
    const startDate = this.toDateOnly(this.newProject.startDate) || this.getStartOfDayDate();
    this.endDateMinDate = this.getTomorrowDate(startDate);
  }

  onStartDateSelected(date: Date | null): void {
    this.newProject.startDate = this.toDateOnly(date) || this.getStartOfDayDate();
    this.refreshEndDateMinDate();

    const endDate = this.toDateOnly(this.newProject.endDate);
    if (endDate && this.newProject.startDate && endDate < this.newProject.startDate) {
      this.newProject.endDate = this.displayEditDialog
        ? this.getStartOfDayDate(this.newProject.startDate)
        : this.getTomorrowDate(this.newProject.startDate);
    }

    this.touchedFields['startDate'] = true;
  }

  onEndDateSelected(date: Date | null): void {
    this.newProject.endDate = this.toDateOnly(date);
    this.touchedFields['endDate'] = true;
  }

  onSelectProject(project: Project): void {
    this.selectedProject = project;
    this.displayEditDialog = false;
    this.displayDetailDialog = true;
    this.loadProjectDetails(project.id);
  }

  openProjectTasks(project: Project): void {
    this.taskService.syncProject({
      externalProjectId: String(project.id),
      name: project.name,
      description: project.description
    }).pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (taskProject) => {
          this.router.navigate(['/tasks', taskProject.id], {
            queryParams: {
              projectName: taskProject.name
            }
          });
        },
        error: (error) => {
          console.error('Failed to sync project with task service', error);
          this.messageService.add({
            severity: 'warn',
            summary: 'Sync failed',
            detail: 'Redirecting to tasks using project name fallback.'
          });
          this.router.navigate(['/tasks'], {
            queryParams: { projectName: project.name }
          });
        }
      });
  }

  openDetailDialog(project: Project): void {
    this.selectedProject = project;
    this.displayEditDialog = false;
    this.displayDetailDialog = true;
    this.loadProjectDetails(project.id);
  }

  loadProjectDetails(projectId: number): void {
    this.resetDocumentForm();
    if (this.isCustomerUser()) {
      // Customers can only access overview + members, not restricted project resources.
      this.projectDocuments = [];
      this.projectMeetings = [];
      this.projectMilestones = [];
      this.projectNotifications = [];
      this.projectRisks = [];
      this.projectSummary = '';
      return;
    }

    this.loadProjectDocuments(projectId);
    this.loadProjectMeetings(projectId);
    this.loadProjectMilestones(projectId);
    this.loadProjectRisks(projectId);
    this.loadProjectNotifications(projectId);
    this.projectSummary = '';
  }

  loadProjectNotifications(projectId: number): void {
    this.projectService.getProjectNotifications(projectId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (notifications) => {
          this.projectNotifications = notifications;
        },
        error: (err: any) => {
          console.error('Error loading notifications', err);
          this.projectNotifications = [];
        }
      });
  }

  getNotificationSeverity(type: string): 'success' | 'info' | 'warning' | 'danger' | undefined {
    switch (type) {
      case 'PROJECT_COMPLETED': return 'success';
      case 'MILESTONE_DELAYED': return 'danger';
      case 'RISK_HIGH': return 'danger';
      case 'DOCUMENT_ADDED': return 'info';
      case 'MEETING_SCHEDULED': return 'info';
      case 'TEAM_CHANGE': return 'success';
      case 'MEMBER_ADDED': return 'success';
      default: return 'info';
    }
  }

  getNotificationMessage(notification: any): string {
    const projectName = notification?.project?.name?.trim();
    const message = notification?.message?.trim();

    if (projectName && message) {
      return `${projectName} · ${message}`;
    }

    return message || projectName || 'New project notification';
  }

  getNotificationRecipient(notification: any): string {
    const user = this.findUserByIdentifier(notification && notification.userId);
    if (user) {
      return this.getUserDisplayName(user);
    }

    const recipientId = notification && notification.userId;
    if (recipientId == null) return '-';

    const text = String(recipientId).trim();
    if (!text) return '-';

    return 'User ' + (text.charAt(0) === '#' ? text : '#' + text);
  }

  private findUserByIdentifier(identifier?: string | number | null): any | null {
    if (identifier == null) return null;

    const normalizedIdentifier = String(identifier).trim().toLowerCase();
    const currentUser = this.authService.getCurrentUser();

    const matches = (user: any): boolean => {
      if (!user) return false;
      const userId = String(user.id ?? '').trim().toLowerCase();
      const username = String(user.username ?? '').trim().toLowerCase();
      const email = String(user.email ?? '').trim().toLowerCase();
      const fullName = String(user.fullName ?? '').trim().toLowerCase();
      return userId === normalizedIdentifier
        || username === normalizedIdentifier
        || email === normalizedIdentifier
        || fullName === normalizedIdentifier;
    };

    const found = this.allDirectoryUsers.find(matches) || this.allUsers.find(matches);
    if (found) {
      return found;
    }

    return matches(currentUser) ? currentUser : null;
  }

  markNotificationAsRead(notificationId: number): void {
    this.projectService.markNotificationAsRead(notificationId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          const notification = this.projectNotifications.find(n => n.id === notificationId);
          if (notification) {
            notification.isRead = true;
          }
          if (this.selectedProject && this.selectedProject.id) {
            this.loadProjectNotifications(this.selectedProject.id);
          }
          this.notificationSyncService.requestNotificationRefresh();
        }
      });
  }

  notifyNotificationByEmail(notification: any): void {
    if (!notification?.id) return;

    const notificationId = Number(notification.id);
    if (!Number.isFinite(notificationId)) {
      return;
    }

    if (this.emailSendingNotificationIds.has(notificationId)) {
      return;
    }

    this.emailSendingNotificationIds.add(notificationId);

    this.projectService.notifyProjectNotificationByEmail(notificationId)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.emailSendingNotificationIds.delete(notificationId);
        })
      )
      .subscribe({
        next: () => {
          this.messageService.add({
            severity: 'success',
            summary: 'Success',
            detail: 'Notification email sent successfully'
          });
        },
        error: (err: any) => {
          console.error('Error sending email notification', err);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: this.getBackendErrorMessage(err, 'Failed to send notification email')
          });
        }
      });
  }

  isSendingEmailNotification(notificationId: number | string | null | undefined): boolean {
    if (notificationId === null || notificationId === undefined) {
      return false;
    }

    const normalizedId = Number(notificationId);
    return Number.isFinite(normalizedId) && this.emailSendingNotificationIds.has(normalizedId);
  }

  // ============ AI SUMMARIZATION ============

  generateProjectSummary(): void {
    if (!this.selectedProject) return;
    this.loadingSummary = true;
    this.projectService.getProjectSummary(this.selectedProject.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (summary: string) => {
          this.projectSummary = summary;
          this.loadingSummary = false;
        },
        error: (err: any) => {
          console.error('Error generating summary', err);
          this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to generate project summary' });
          this.loadingSummary = false;
        }
      });
  }

  getProjectSummarySections(): ProjectSummarySection[] {
    const summary = this.projectSummary.trim();
    if (!summary) {
      return [];
    }

    const sections = this.parseProjectSummarySections(summary);
    return sections.length > 0 ? sections : [{ title: 'Summary', content: summary }];
  }

  private parseProjectSummarySections(summary: string): ProjectSummarySection[] {
    const headings = this.projectSummarySectionTitles.join('|');
    const headingPattern = new RegExp(`^\\s*(?:[-*•]\\s*)?(?:\\d+[).\\-\\s]*)?(${headings})\\s*:?(.*)$`, 'i');

    const sections: ProjectSummarySection[] = [];
    let currentSection: ProjectSummarySection | null = null;

    summary.split(/\r?\n/).forEach(rawLine => {
      const line = rawLine.trim();
      if (!line) {
        return;
      }

      const match = line.match(headingPattern);
      if (match) {
        currentSection = {
          title: this.normalizeProjectSummaryTitle(match[1]),
          content: match[2] ? match[2].trim() : ''
        };
        sections.push(currentSection);
        return;
      }

      if (!currentSection) {
        currentSection = { title: 'Summary', content: line };
        sections.push(currentSection);
        return;
      }

      currentSection.content = currentSection.content
        ? `${currentSection.content}\n${line}`
        : line;
    });

    return sections.filter(section => section.title && (section.content || section.title !== 'Summary'));
  }

  private normalizeProjectSummaryTitle(title: string): string {
    const normalized = title.trim().toLowerCase();
    const mapped = this.projectSummarySectionTitles.find(item => item.toLowerCase() === normalized);
    return mapped || title.trim();
  }


  // ============ RISK MANAGEMENT ============

  loadProjectRisks(projectId: number): void {
    this.riskService.getRisksByProjectId(projectId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (risks: Risk[]) => {
          this.projectRisks = risks || [];
        },
        error: (error: any) => {
          console.error('Error loading project risks', error);
          this.projectRisks = [];
        }
      });
  }

  getRiskSeverityColor(severity: string): 'success' | 'info' | 'warning' | 'danger' | undefined {
    switch (severity?.toUpperCase()) {
      case 'LOW': return 'success';
      case 'MEDIUM': return 'warning';
      case 'HIGH':
      case 'CRITICAL': return 'danger';
      default: return 'info';
    }
  }

  // ============ MILESTONE MANAGEMENT ============

  loadProjectMilestones(projectId: number): void {
    this.milestoneService.getByProject(projectId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (milestones: Milestone[]) => {
          this.projectMilestones = this.sortMilestonesForTimeline(milestones || []) as Milestone[];
        },
        error: (error: any) => {
          console.error('Error loading project milestones', error);
          this.projectMilestones = [];
        }
      });
  }

  openMilestoneDialog(milestone?: Milestone): void {
    if (!this.canManageProjectMilestones()) {
      this.messageService.add({ severity: 'warn', summary: 'Unauthorized', detail: 'Project members can only consult projects' });
      return;
    }
    const fallbackProjectId = typeof this.newProject?.id === 'number'
      ? this.newProject.id
      : Number(this.newProject?.id);
    this.milestoneDialogProjectId = this.selectedProject?.id || (Number.isFinite(fallbackProjectId) ? fallbackProjectId : null);

    if (milestone) {
      this.editingMilestoneId = milestone.id;
      this.milestoneForm = {
        title: milestone.title,
        description: milestone.description,
        dueDate: this.formatDateForPayload(milestone.dueDate) || this.getTodayDateInputValue(),
        status: milestone.status,
        actualCompletionDate: this.formatDateForPayload(milestone.actualCompletionDate || milestone.completionDate) || '',
        isCritical: milestone.isCritical
      };
    } else {
      this.resetMilestoneDialogState();
    }
    this.displayMilestoneDialog = true;
  }

  openPendingMilestoneDialog(index?: number): void {
    this.editingMilestoneId = null;
    this.milestoneDialogProjectId = null;

    if (index !== undefined && index !== null && index >= 0 && index < this.pendingMilestones.length) {
      const milestone = this.pendingMilestones[index];
      this.pendingMilestoneEditIndex = index;
      this.milestoneForm = {
        title: milestone.title,
        description: milestone.description,
        dueDate: milestone.dueDate,
        status: milestone.status,
        actualCompletionDate: '',
        isCritical: milestone.isCritical
      };
    } else {
      this.pendingMilestoneEditIndex = null;
      this.milestoneForm = {
        title: '',
        description: '',
        dueDate: this.getTodayDateInputValue(),
        status: MilestoneStatus.PENDING,
        actualCompletionDate: '',
        isCritical: false
      };
    }

    this.displayMilestoneDialog = true;
  }

  closeMilestoneDialog(): void {
    this.displayMilestoneDialog = false;
    this.pendingMilestoneEditIndex = null;
    this.resetMilestoneDialogState();
  }

  private resetMilestoneDialogState(): void {
    this.editingMilestoneId = null;
    this.milestoneDialogProjectId = null;
    this.milestoneForm = {
      title: '',
      description: '',
      dueDate: this.getTodayDateInputValue(),
      status: MilestoneStatus.PENDING,
      actualCompletionDate: '',
      isCritical: false
    };
  }

  saveMilestone(): void {
    if (!this.canManageProjectMilestones()) {
      this.messageService.add({ severity: 'warn', summary: 'Unauthorized', detail: 'Project members can only consult projects' });
      return;
    }
    if (this.displayCreateDialog && !this.selectedProject) {
      this.saveMilestoneInPendingList();
      return;
    }

    const fallbackProjectId = typeof this.newProject?.id === 'number'
      ? this.newProject.id
      : Number(this.newProject?.id);
    const projectId = this.milestoneDialogProjectId
      || this.selectedProject?.id
      || (Number.isFinite(fallbackProjectId) ? fallbackProjectId : null);

    if (!projectId) {
      console.warn('[Milestone][save] Missing projectId', {
        selectedProjectId: this.selectedProject?.id,
        milestoneDialogProjectId: this.milestoneDialogProjectId,
        newProjectId: this.newProject?.id
      });
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Unable to identify the project for this milestone' });
      return;
    }

    if (!this.milestoneForm.title) {
      console.warn('[Milestone][save] Missing title');
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Milestone title is required' });
      return;
    }

    const dueDate = this.formatDateForPayload(this.milestoneForm.dueDate);
    if (!dueDate) {
      console.warn('[Milestone][save] Missing/invalid dueDate', this.milestoneForm.dueDate);
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Milestone due date is required' });
      return;
    }

    const actualCompletionDate = this.formatDateForPayload(this.milestoneForm.actualCompletionDate) || '';

    if (this.milestoneForm.status === MilestoneStatus.ACHIEVED && !actualCompletionDate) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Actual completion date is required when the milestone is achieved'
      });
      return;
    }

    const payload: MilestoneRequest = {
      projectId,
      title: this.milestoneForm.title.trim(),
      description: this.milestoneForm.description?.trim() || '',
      dueDate,
      status: this.milestoneForm.status || MilestoneStatus.PENDING,
      isCritical: !!this.milestoneForm.isCritical,
      actualCompletionDate: actualCompletionDate || undefined
    };

    const isEdit = this.editingMilestoneId !== null;
    console.log('[Milestone][save] Sending request', {
      mode: isEdit ? 'update' : 'create',
      projectId,
      payload
    });

    this.isSubmittingMilestones = true;

    if (isEdit) {
      const id = this.editingMilestoneId as number;
      this.milestoneService.update(id, payload)
        .pipe(takeUntil(this.destroy$))
        .pipe(finalize(() => this.isSubmittingMilestones = false))
        .subscribe({
          next: () => {
            this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Milestone updated' });
            this.loadProjectMilestones(projectId);
            this.closeMilestoneDialog();
          },
          error: (err: any) => {
            console.error('Error updating milestone', err);
            this.messageService.add({ severity: 'error', summary: 'Error', detail: this.getBackendErrorMessage(err, 'Failed to update milestone') });
          }
        });
    } else {
      this.projectService.createProjectMilestone(projectId, {
        title: payload.title,
        description: payload.description,
        dueDate: payload.dueDate,
        status: payload.status,
        isCritical: payload.isCritical,
        actualCompletionDate: payload.actualCompletionDate
      })
        .pipe(takeUntil(this.destroy$))
        .pipe(finalize(() => this.isSubmittingMilestones = false))
        .subscribe({
          next: () => {
            this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Milestone created' });
            this.loadProjectMilestones(projectId);
            this.closeMilestoneDialog();
          },
          error: (err: any) => {
            console.error('Error creating milestone', err);
            this.messageService.add({ severity: 'error', summary: 'Error', detail: this.getBackendErrorMessage(err, 'Failed to create milestone') });
          }
        });
    }
  }

  private saveMilestoneInPendingList(): void {
    if (!this.milestoneForm.title?.trim()) {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Milestone title is required' });
      return;
    }

    const dueDate = this.formatDateForPayload(this.milestoneForm.dueDate);
    if (!dueDate) {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Milestone due date is required' });
      return;
    }

    const dueDateValue = this.toDateOnly(dueDate);
    const projectStart = this.toDateOnly(this.newProject.startDate);
    const projectEnd = this.toDateOnly(this.newProject.endDate);

    if (!dueDateValue) {
      this.messageService.add({ severity: 'error', summary: 'Validation Error', detail: 'Please provide a valid milestone due date' });
      return;
    }

    if (projectStart && dueDateValue < projectStart) {
      this.messageService.add({ severity: 'error', summary: 'Validation Error', detail: 'Milestone due date cannot be before the project start date' });
      return;
    }

    if (projectEnd && dueDateValue > projectEnd) {
      this.messageService.add({ severity: 'error', summary: 'Validation Error', detail: 'Milestone due date cannot be after the project end date' });
      return;
    }

    const payload: PendingMilestoneDraft = {
      title: this.milestoneForm.title.trim(),
      description: this.milestoneForm.description?.trim() || '',
      dueDate,
      status: this.milestoneForm.status || MilestoneStatus.PENDING,
      isCritical: !!this.milestoneForm.isCritical
    };

    if (this.pendingMilestoneEditIndex !== null) {
      this.pendingMilestones[this.pendingMilestoneEditIndex] = payload;
      this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Pending milestone updated' });
    } else {
      this.pendingMilestones.push(payload);
      this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Pending milestone added' });
    }

    this.closeMilestoneDialog();
    this.resetPendingMilestoneForm();
  }

  savePendingMilestone(): void {
    if (!this.canManageProjectMilestones()) {
      this.messageService.add({ severity: 'warn', summary: 'Unauthorized', detail: 'Project members can only consult projects' });
      return;
    }
    if (!this.pendingMilestoneForm.title?.trim() || !this.pendingMilestoneForm.dueDate) {
      this.messageService.add({ severity: 'error', summary: 'Validation Error', detail: 'Milestone title and due date are required' });
      return;
    }

    const dueDate = this.toDateOnly(this.pendingMilestoneForm.dueDate);
    const projectStart = (this.displayEditDialog && this.selectedProject) ? this.toDateOnly(this.selectedProject.startDate) : this.toDateOnly(this.newProject.startDate);
    const projectEnd = (this.displayEditDialog && this.selectedProject) ? this.toDateOnly(this.selectedProject.endDate) : this.toDateOnly(this.newProject.endDate);

    if (!dueDate) {
      this.messageService.add({ severity: 'error', summary: 'Validation Error', detail: 'Please provide a valid milestone due date' });
      return;
    }

    if (projectStart && dueDate < projectStart) {
      this.messageService.add({ severity: 'error', summary: 'Validation Error', detail: 'Milestone due date cannot be before the project start date' });
      return;
    }

    if (projectEnd && dueDate > projectEnd) {
      this.messageService.add({ severity: 'error', summary: 'Validation Error', detail: 'Milestone due date cannot be after the project end date' });
      return;
    }

    const payload = {
      title: this.pendingMilestoneForm.title.trim(),
      description: this.pendingMilestoneForm.description?.trim() || '',
      dueDate: this.formatDateForPayload(this.pendingMilestoneForm.dueDate) || '',
      status: this.pendingMilestoneForm.status || MilestoneStatus.PENDING,
      isCritical: !!this.pendingMilestoneForm.isCritical
    };

    if (this.displayEditDialog && this.selectedProject) {
      // If we are in Edit Mode, we immediately persist it to the database
      this.isSubmittingMilestones = true;
      this.projectService.createProjectMilestone(this.selectedProject.id, payload)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.isSubmittingMilestones = false)
      )
      .subscribe({
        next: () => {
          this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Milestone saved to project' });
          this.loadProjectMilestones(this.selectedProject!.id);
          this.resetPendingMilestoneForm();
        },
        error: (err) => {
          console.error('Error adding milestone to existing project:', err);
          this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to save milestone to database' });
        }
      });
    } else {
      // Creation mode: standard local list
      if (this.pendingMilestoneEditIndex !== null) {
        this.pendingMilestones[this.pendingMilestoneEditIndex] = payload;
        this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Pending milestone updated' });
      } else {
        this.pendingMilestones.push(payload);
        this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Pending milestone added' });
      }
      this.resetPendingMilestoneForm();
    }
  }

  startEditPendingMilestone(index: number): void {
    const milestone = this.pendingMilestones[index];
    if (!milestone) return;
    this.pendingMilestoneEditIndex = index;
    this.pendingMilestoneForm = { ...milestone };
  }

  removePendingMilestone(index: number): void {
    if (index < 0 || index >= this.pendingMilestones.length) return;
    const removed = this.pendingMilestones.splice(index, 1)[0];
    if (this.pendingMilestoneEditIndex === index) {
      this.resetPendingMilestoneForm();
    }
    this.messageService.add({ severity: 'info', summary: 'Removed', detail: `${removed?.title || 'Milestone'} removed from pending list` });
  }

  startEditDocument(document: ProjectDocument): void {
    this.editingDocumentId = document.id;
    this.selectedDocumentFileName = '';
    this.documentForm = {
      name: document.name,
      description: document.description || '',
      fileUrl: document.fileUrl,
      type: document.type,
      version: document.version,
      uploadedBy: document.uploadedBy || ''
    };
  }

  cancelDocumentEdit(): void {
    this.editingDocumentId = null;
    this.documentForm = this.buildEmptyDocumentForm();
    this.selectedDocumentFileName = '';
  }

  startEditPendingDocument(index: number): void {
    const document = this.pendingDocuments[index];
    if (!document) return;
    this.pendingDocumentEditIndex = index;
    this.documentForm = { ...document };
    this.selectedDocumentFileName = '';
  }

  cancelPendingDocumentEdit(): void {
    this.pendingDocumentEditIndex = null;
    this.resetDocumentForm();
  }

  onDocumentPdfSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files && input.files.length > 0 ? input.files[0] : null;
    if (!file) {
      return;
    }

    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    if (!isPdf) {
      this.messageService.add({ severity: 'error', summary: 'Validation Error', detail: 'Only PDF files are allowed' });
      this.clearDocumentFileSelection(input);
      return;
    }

    const maxSizeMb = 10;
    if (file.size > maxSizeMb * 1024 * 1024) {
      this.messageService.add({ severity: 'error', summary: 'Validation Error', detail: `PDF file size must be <= ${maxSizeMb} MB` });
      this.clearDocumentFileSelection(input);
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      if (!result) {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Unable to read selected PDF file' });
        this.clearDocumentFileSelection(input);
        return;
      }

      this.documentForm.fileUrl = result;
      if (!this.documentForm.name?.trim()) {
        this.documentForm.name = file.name.replace(/\.pdf$/i, '');
      }
      this.selectedDocumentFileName = file.name;
    };

    reader.onerror = () => {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Unable to load PDF file' });
      this.clearDocumentFileSelection(input);
    };

    reader.readAsDataURL(file);
  }

  clearDocumentFileSelection(input?: HTMLInputElement): void {
    if (this.documentForm.fileUrl && this.documentForm.fileUrl.startsWith('data:application/pdf')) {
      this.documentForm.fileUrl = '';
    }
    this.selectedDocumentFileName = '';
    if (input) {
      input.value = '';
    }
  }

  savePendingDocument(): void {
    const fileSource = (this.documentForm.fileUrl || '').trim();
    if (!this.documentForm.name?.trim() || !fileSource) {
      this.messageService.add({ severity: 'error', summary: 'Validation Error', detail: 'Document name and file source are required' });
      return;
    }
    // Inline base64 payloads can trigger backend 500 errors (DB/packet limits).
    if (fileSource.startsWith('data:application/pdf') && fileSource.length > 3_000_000) {
      this.messageService.add({
        severity: 'error',
        summary: 'Validation Error',
        detail: 'PDF is too large for inline upload. Use a smaller file or provide an external file URL.'
      });
      return;
    }

    const payload: ProjectDocumentForm = {
      name: this.documentForm.name.trim(),
      description: this.documentForm.description?.trim() || '',
      fileUrl: fileSource,
      type: this.documentForm.type || 'DOCUMENTATION',
      version: this.documentForm.version || '1.0',
      uploadedBy: this.resolveDocumentUploader(this.documentForm.uploadedBy)
    };

    const isCreateMode = this.displayCreateDialog && !this.displayEditDialog;

    if (isCreateMode) {
      if (this.pendingDocumentEditIndex !== null) {
        this.pendingDocuments[this.pendingDocumentEditIndex] = { ...payload };
        this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Document in list updated' });
      } else {
        this.pendingDocuments.push({ ...payload });
        this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Document added to creation list' });
      }

      this.pendingDocumentEditIndex = null;
      this.resetDocumentForm();
      return;
    }

    if (!this.selectedProject) {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No selected project for document operation' });
      return;
    }
    const selectedProjectId = this.selectedProject.id;

    if (this.editingDocumentId != null) {
      // Update existing document
      this.projectDocumentService.update(this.editingDocumentId, selectedProjectId, payload)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Document updated' });
            this.loadProjectDocuments(selectedProjectId);
            this.cancelDocumentEdit();
          },
          error: (err: any) => {
            console.error('Error updating document:', err);
            this.messageService.add({
              severity: 'error',
              summary: 'Error',
              detail: this.getBackendErrorMessage(err, 'Failed to update document')
            });
          }
        });
    } else {
      // Create new document
      this.projectDocumentService.create(selectedProjectId, payload)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Document uploaded' });
            this.loadProjectDocuments(selectedProjectId);
            this.resetDocumentForm();
          },
          error: (err: any) => {
            console.error('Error uploading document:', err);
            this.messageService.add({
              severity: 'error',
              summary: 'Error',
              detail: this.getBackendErrorMessage(err, 'Failed to upload document')
            });
          }
        });
    }
  }

  saveDocument(): void {
    this.savePendingDocument();
  }

  removePendingDocument(index: number): void {
    if (index < 0 || index >= this.pendingDocuments.length) return;
    this.pendingDocuments.splice(index, 1);

    if (this.pendingDocumentEditIndex === index) {
      this.pendingDocumentEditIndex = null;
      this.resetDocumentForm();
      return;
    }

    if (this.pendingDocumentEditIndex !== null && this.pendingDocumentEditIndex > index) {
      this.pendingDocumentEditIndex -= 1;
    }
  }

  deleteDocument(document: ProjectDocument): void {
    this.confirmationService.confirm({
      message: `Are you sure you want to delete the document "${document.name}"?`,
      header: 'Confirm Deletion',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        this.projectDocumentService.delete(document.id)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: () => {
              this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Document deleted' });
              this.loadProjectDocuments(this.selectedProject!.id);
            },
            error: (err: any) => {
              console.error('Error deleting document', err);
              this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to delete document' });
            }
          });
      }
    });
  }

  addMilestonesToCreatedProject(createdProject: any, milestonesToAdd: PendingMilestoneDraft[], onComplete: () => void): void {
    const milestonesTotal = milestonesToAdd.length;
    if (milestonesTotal === 0) {
      onComplete();
      return;
    }

    let milestonesProcessed = 0;

    milestonesToAdd.forEach((milestone) => {
      const payload = {
        title: milestone.title,
        description: milestone.description || '',
        dueDate: milestone.dueDate,
        status: milestone.status || MilestoneStatus.PENDING,
        isCritical: !!milestone.isCritical
      };

      this.projectService.createProjectMilestone(createdProject.id, payload)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            milestonesProcessed++;
            if (milestonesProcessed === milestonesTotal) {
              onComplete();
            }
          },
          error: (error) => {
            console.error('Error adding milestone to created project:', error);
            milestonesProcessed++;
            if (milestonesProcessed === milestonesTotal) {
              onComplete();
            }
          }
        });
    });
  }

  cancelDelete(): void {
    this.displayDeleteDialog = false;
  }

  onRowsPerPageChange(): void {
    this.currentPage = 1;
    this.updatePaginatedProjects();
  }

  updatePaginatedProjects(): void {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    this.paginatedProjects = this.projects.slice(startIndex, endIndex);
  }

  toggleViewMode(mode: 'grid' | 'list'): void {
    this.viewMode = mode;
  }

  onPageChange(event: any): void {
    this.currentPage = (event.page || 0) + 1;
    this.itemsPerPage = event.rows;
    this.updatePaginatedProjects();
  }

  closeDetailDialog(): void {
    this.displayDetailDialog = false;
    this.selectedProject = null;
    this.projectDocuments = [];
    this.projectMeetings = [];
    this.projectMilestones = [];
    this.projectRisks = [];
    this.projectNotifications = [];
    this.projectSummary = '';
  }

  private getBackendErrorMessage(err: any, fallback: string): string {
    const message = err?.error?.message || err?.error?.detail || err?.message;
    if (typeof message === 'string' && message.trim()) {
      return message;
    }

    if (err?.error && typeof err.error === 'object') {
      const values = Object.values(err.error).filter(value => typeof value === 'string' && value.trim());
      if (values.length > 0) {
        return values.join(' | ');
      }
    }

    return fallback;
  }

  openCreateDialog(): void {
    if (!this.canCreateProjects()) {
      this.messageService.add({ severity: 'warn', summary: 'Unauthorized', detail: 'Only admin or project manager can create a project' });
      return;
    }
    this.selectedProject = null;
    this.today = this.getStartOfDayDate();
    this.endDateMinDate = this.getTomorrowDate(this.today);
    this.newProject = {
      name: '',
      description: '',
      objectives: '',
      startDate: this.getStartOfDayDate(),
      endDate: null,
      visibility: 'PRIVATE'
    };
    this.selectedCustomer = null;
    if (this.isCustomerUser()) {
      const currentUser = this.authService.getCurrentUser();
      this.selectedCustomer = currentUser ? {
        id: currentUser.id,
        email: currentUser.email,
        fullName: currentUser.email
      } : null;
    }
    this.touchedFields = {};
    this.projectMembersToAdd = [];
    this.selectedUsersToAdd = [];
    this.pendingDocuments = [];
    this.pendingMilestones = [];
    this.projectMilestones = []; // Clear current project milestones
    this.resetDocumentForm();
    this.resetPendingMilestoneForm();
    this.refreshEndDateMinDate();
    this.displayCreateDialog = true;
  }

  cancelCreate(): void {
    this.displayCreateDialog = false;
    this.selectedProject = null;
    this.pendingDocuments = [];
    this.pendingMilestones = [];
    this.resetDocumentForm();
    this.resetPendingMilestoneForm();
  }

  createProject(): void {
    if (!this.canCreateProjects()) {
      this.messageService.add({ severity: 'warn', summary: 'Unauthorized', detail: 'Only admin or project manager can create a project' });
      return;
    }
    if (!this.isFormValid()) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Warning',
        detail: 'Please complete the project form before creating it'
      });
      return;
    }

    this.loading = true;
    this.projectService.createProject(this.buildProjectPayload())
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (project) => {
          const membersToAdd = [...this.projectMembersToAdd];
          const documentsToAdd = this.pendingDocuments.map(document => this.normalizeDocumentPayload(document));
          const milestonesToAdd = [...this.pendingMilestones];

          if (this.isCustomerUser()) {
            this.completeProjectCreation(project, 0, 0, 0);
            return;
          }

          // Add members and documents after project creation
          this.addMembersToCreatedProject(project, membersToAdd, () => {
            this.addDocumentsToCreatedProject(project, documentsToAdd, () => {
              this.addMilestonesToCreatedProject(project, milestonesToAdd, () => {
                this.completeProjectCreation(project, membersToAdd.length, documentsToAdd.length, milestonesToAdd.length);
              });
            });
          });
        },
        error: (err) => {
          console.error('Error creating project', err);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: this.getBackendErrorMessage(err, 'Failed to create project')
          });
          this.loading = false;
        }
      });
  }

  openEditDialog(project: Project): void {
    if (!this.canEdit(project)) {
      this.messageService.add({ severity: 'warn', summary: 'Unauthorized', detail: 'Project members can only consult projects' });
      return;
    }
    this.selectedProject = project;
    this.newProject = {
      ...project,
      startDate: this.toDateOnly(project.startDate),
      endDate: this.toDateOnly(project.endDate),
      actualEndDate: this.toDateOnly(project.actualEndDate)
    };
    this.editProgressValue = project.progress || 0;
    this.syncSelectedCustomer(project.customerId);
    this.touchedFields = {};
    this.editSelectedUsersToAdd = [];
    this.pendingMilestones = [];
    this.projectMilestones = []; // Initial clear, will be loaded by loadProjectDetails
    this.resetPendingMilestoneForm();
    this.refreshEndDateMinDate();
    this.displayEditDialog = true;
    this.loadProjectDetails(project.id);
  }

  cancelEdit(): void {
    this.displayEditDialog = false;
    this.selectedProject = null;
    this.pendingMilestones = [];
    this.resetPendingMilestoneForm();
  }

  updateProject(): void {
    if (!this.selectedProject) return;
    if (!this.canEdit(this.selectedProject)) {
      this.messageService.add({ severity: 'warn', summary: 'Unauthorized', detail: 'Project members can only consult projects' });
      return;
    }
    if (!this.isEditFormValid()) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Warning',
        detail: 'Please correct the project form before saving'
      });
      return;
    }

    this.loading = true;
    this.projectService.updateProject(this.selectedProject.id, this.buildProjectPayload())
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (updatedProject) => {
          this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Project updated' });
          this.displayEditDialog = false;
          this.loadProjects();
          this.notificationSyncService.requestNotificationRefresh();
          // Clear touched fields and reset selected customer to prevent carrying over to next action
          this.touchedFields = {};
          this.selectedCustomer = null;
        },
        error: (err) => {
          console.error('Error updating project', err);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: this.getBackendErrorMessage(err, 'Failed to update project')
          });
          this.loading = false;
        }
      });
  }

  openDeleteDialog(project: Project): void {
    if (!this.canDelete(project)) {
      this.messageService.add({ severity: 'warn', summary: 'Unauthorized', detail: 'Project members can only consult projects' });
      return;
    }
    this.selectedProject = project;
    this.displayDeleteDialog = true;
  }

  confirmDelete(): void {
    if (!this.selectedProject) return;
    if (!this.canDelete(this.selectedProject)) {
      this.messageService.add({ severity: 'warn', summary: 'Unauthorized', detail: 'Project members can only consult projects' });
      return;
    }
    this.loading = true;
    this.projectService.deleteProject(this.selectedProject.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Project deleted' });
          this.displayDeleteDialog = false;
          this.loadProjects();
        },
        error: (err) => {
          console.error('Error deleting project', err);
          this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to delete project' });
          this.loading = false;
        }
      });
  }

  // Member management helpers
  addSelectedMembersToExistingProject(): void {
    if (!this.selectedProject || this.editSelectedUsersToAdd.length === 0) return;

    this.loading = true;
    let added = 0;
    const total = this.editSelectedUsersToAdd.length;

    this.editSelectedUsersToAdd.forEach(user => {
      this.projectService.addProjectMember(this.selectedProject!.id, user.email)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            added++;
            if (added === total) {
              this.messageService.add({ severity: 'success', summary: 'Success', detail: `${added} member(s) added` });
              this.loadProjectDetails(this.selectedProject!.id);
              this.editSelectedUsersToAdd = [];
              this.loading = false;
            }
          },
          error: (err) => {
            console.error('Error adding member to project', err);
            added++;
            if (added === total) {
              this.loadProjectDetails(this.selectedProject!.id);
              this.loading = false;
            }
          }
        });
    });
  }

  removeMember(userId: string | number): void {
    if (!this.selectedProject) return;

    const user = this.findUserById(userId);
    const displayName = user ? this.getUserDisplayName(user) : 'this member';
    const projectId = this.selectedProject.id;
    const normalizedUserId = String(userId);

    this.confirmationService.confirm({
      message: `Are you sure you want to remove ${displayName} from the project?`,
      header: 'Confirm Removal',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        this.projectService.removeProjectMember(projectId, normalizedUserId)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: () => {
              this.markMemberInactiveLocally(projectId, normalizedUserId);
              this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Member removed' });
              this.notificationSyncService.requestNotificationRefresh();
            },
            error: (err) => {
              console.error('Error removing member', err);
              this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to remove member' });
            }
          });
      }
    });
  }

  private markMemberInactiveLocally(projectId: number, userId: string): void {
    const markInactive = (project: Project | null | undefined): boolean => {
      if (!project?.members || project.id !== projectId) {
        return false;
      }

      const member = project.members.find(m => String(m?.userId) === userId);
      if (!member) {
        return false;
      }

      member.isActive = false;
      return true;
    };

    const updatedSelected = markInactive(this.selectedProject);
    const updatedInProjects = this.projects.some(project => markInactive(project));

    if (updatedSelected || updatedInProjects) {
      this.updatePaginatedProjects();
    }
  }

  // Validation helpers
  onFieldTouched(field: string): void {
    this.touchedFields[field] = true;
  }

  isFormValid(): boolean {
    return !!(this.newProject.name?.trim() && this.newProject.startDate && this.newProject.endDate);
  }

  isEditFormValid(): boolean {
    return this.isFormValid();
  }

  getProjectNameError(): string | null {
    if (this.touchedFields['name'] && !this.newProject.name?.trim()) {
      return 'Project name is required';
    }
    return null;
  }

  getDescriptionError(): string | null {
    if (this.touchedFields['description'] && !this.newProject.description?.trim()) {
      return 'Description is required';
    }
    return null;
  }

  getObjectivesError(): string | null {
    if (this.touchedFields['objectives'] && !this.newProject.objectives?.trim()) {
      return 'Objectives are required';
    }
    return null;
  }

  getStartDateError(): string | null {
    if (this.touchedFields['startDate'] && !this.newProject.startDate) {
      return 'Start date is required';
    }
    return null;
  }

  getEndDateError(): string | null {
    if (this.touchedFields['endDate'] && !this.newProject.endDate) {
      return 'End date is required';
    }
    return null;
  }

  getProgressLabel(progress: number): string {
    if (progress >= 100) return 'completed';
    if (progress >= 75) return 'high';
    if (progress >= 40) return 'medium';
    if (progress > 0) return 'low';
    return 'none';
  }

  getProgressLabelText(progress: number): string {
    if (progress >= 100) return 'Completed';
    if (progress >= 75) return 'Almost Done';
    if (progress >= 40) return 'In Progress';
    if (progress > 0) return 'Started';
    return 'Not Started';
  }

  getStatusLabel(status?: string): string {
    if (!status) return '-';
    return status.replace(/_/g, ' ');
  }

  getStatusSeverity(status?: string): 'success' | 'info' | 'warning' | 'danger' | undefined {
    switch (status) {
      case 'COMPLETED': return 'success';
      case 'IN_PROGRESS': return 'info';
      case 'PLANNED': return 'info';
      case 'ON_HOLD': return 'warning';
      case 'CANCELLED': return 'danger';
      default: return 'info';
    }
  }

  openDocument(url: string): void {
    window.open(url, '_blank');
  }

  downloadDocument(url: string, filename: string): void {
    const safeFilename = filename?.includes('.') ? filename : `${filename}.pdf`;
    const link = document.createElement('a');
    link.href = url;
    link.download = safeFilename;
    link.target = '_blank';
    link.click();
  }

  resetPendingMilestoneForm(): void {
    this.pendingMilestoneEditIndex = null;
    this.pendingMilestoneForm = {
      title: '',
      description: '',
      dueDate: '',
      status: MilestoneStatus.PENDING,
      isCritical: false
    };
  }

  resetDocumentForm(): void {
    this.editingDocumentId = null;
    this.pendingDocumentEditIndex = null;
    this.selectedDocumentFileName = '';
    this.documentForm = this.buildEmptyDocumentForm();
  }

  isPdfUrl(url: string | null | undefined): boolean {
    if (!url) {
      return false;
    }
    const normalized = url.trim().toLowerCase();
    return normalized.startsWith('data:application/pdf') || normalized.includes('.pdf');
  }

  private buildEmptyDocumentForm(): ProjectDocumentForm {
    return {
      name: '',
      type: 'DOCUMENTATION',
      fileUrl: '',
      description: '',
      version: '1.0',
      uploadedBy: this.resolveDocumentUploader()
    };
  }

  private resolveDocumentUploader(preferred?: string | null): string {
    const preferredValue = (preferred || '').trim();
    if (preferredValue) {
      return preferredValue;
    }

    const currentUser = this.authService.getCurrentUser();
    if (!currentUser) {
      return '';
    }

    const fullName = `${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim();
    if (fullName) {
      return fullName;
    }

    if (currentUser.email?.trim()) {
      return currentUser.email.trim();
    }

    return currentUser.id != null ? String(currentUser.id) : '';
  }

  private normalizeDocumentPayload(document: ProjectDocumentForm): ProjectDocumentForm {
    return {
      ...document,
      uploadedBy: this.resolveDocumentUploader(document.uploadedBy)
    };
  }

  loadProjectDocuments(projectId: number): void {
    this.projectDocumentService.getByProject(projectId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (documents) => {
          this.projectDocuments = documents;
        },
        error: (err: any) => {
          console.error('Error loading documents', err);
          this.projectDocuments = [];
        }
      });
  }

  // ============ TIMELINE LOGIC ============

  getProjectMilestoneTimelineEntries(): MilestoneTimelineEntry[] {
    if (!this.projectMilestones || this.projectMilestones.length === 0) return [];

    const sorted = [...this.projectMilestones].sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
    const achieved = sorted.filter(m => m.status === MilestoneStatus.ACHIEVED);
    const upcoming = sorted.filter(m => m.status !== MilestoneStatus.ACHIEVED);

    const entries: MilestoneTimelineEntry[] = [];

    achieved.forEach(m => entries.push({ kind: 'milestone', milestone: m, state: 'achieved' }));

    if (achieved.length > 0 && upcoming.length > 0) {
      entries.push({ kind: 'marker', label: 'Present Day' });
    }

    upcoming.forEach(m => {
      const state = this.getMilestoneState(m);
      entries.push({ kind: 'milestone', milestone: m, state });
    });

    return entries;
  }

  getPendingMilestoneTimelineEntries(): MilestoneTimelineEntry[] {
    if (!this.pendingMilestones || this.pendingMilestones.length === 0) return [];

    const sorted = [...this.pendingMilestones].sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
    const achieved = sorted.filter(m => m.status === MilestoneStatus.ACHIEVED);
    const upcoming = sorted.filter(m => m.status !== MilestoneStatus.ACHIEVED);

    const entries: MilestoneTimelineEntry[] = [];
    achieved.forEach(m => entries.push({ kind: 'milestone', milestone: m, state: 'achieved' }));
    if (achieved.length > 0 && upcoming.length > 0) {
      entries.push({ kind: 'marker', label: 'Present Day' });
    }
    upcoming.forEach(m => {
      const state = this.getMilestoneState(m);
      entries.push({ kind: 'milestone', milestone: m, state });
    });

    return entries;
  }

  private getMilestoneState(milestone: MilestoneLike): MilestoneTimelineState {
    if (milestone.status === MilestoneStatus.ACHIEVED) return 'achieved';
    if (milestone.status === MilestoneStatus.CANCELLED) return 'cancelled';
    if (milestone.status === MilestoneStatus.MISSED) return 'overdue';
    if (milestone.status === MilestoneStatus.IN_PROGRESS) return 'current';

    const due = new Date(milestone.dueDate);
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    return due < now ? 'overdue' : 'upcoming';
  }

  getMilestoneTimelineIcon(state: MilestoneTimelineState): string {
    switch (state) {
      case 'achieved': return 'pi pi-check';
      case 'current': return 'pi pi-play';
      case 'overdue': return 'pi pi-exclamation-triangle';
      case 'cancelled': return 'pi pi-times';
      default: return 'pi pi-calendar';
    }
  }

  getMilestoneTimelineStatusLabel(state: MilestoneTimelineState): string {
    switch (state) {
      case 'achieved': return 'Achieved';
      case 'overdue': return 'Overdue';
      case 'cancelled': return 'Cancelled';
      default: return 'Upcoming';
    }
  }

  getMilestoneTimelineSeverity(state: MilestoneTimelineState): 'success' | 'warning' | 'danger' | 'info' | undefined {
    switch (state) {
      case 'achieved': return 'success';
      case 'overdue': return 'danger';
      case 'cancelled': return 'info';
      default: return 'info';
    }
  }

  getMilestoneTimelineDateLabel(milestone: MilestoneLike): string {
    if (milestone.status === MilestoneStatus.ACHIEVED && (milestone.actualCompletionDate || milestone.completionDate)) {
      return `Achieved on ${this.formatDate(milestone.actualCompletionDate || milestone.completionDate)}`;
    }
    return `Due on ${this.formatDate(milestone.dueDate)}`;
  }

  getProjectMilestoneTimelineStats() {
    const entries = this.getProjectMilestoneTimelineEntries().filter(e => e.kind === 'milestone') as { milestone: MilestoneLike; state: MilestoneTimelineState }[];
    return {
      achieved: entries.filter(e => e.state === 'achieved').length,
      current: entries.filter(e => e.state === 'current').length,
      upcoming: entries.filter(e => e.state === 'upcoming').length,
      overdue: entries.filter(e => e.state === 'overdue').length
    };
  }

  getPendingMilestoneTimelineStats() {
    const entries = this.getPendingMilestoneTimelineEntries().filter(e => e.kind === 'milestone') as { milestone: MilestoneLike; state: MilestoneTimelineState }[];
    return {
      achieved: entries.filter(e => e.state === 'achieved').length,
      current: entries.filter(e => e.state === 'current').length,
      upcoming: entries.filter(e => e.state === 'upcoming').length,
      overdue: entries.filter(e => e.state === 'overdue').length
    };
  }

  getMilestoneCompletionPercent(milestones: MilestoneLike[]): number {
    const planned = (milestones || []).filter(m => m.status !== MilestoneStatus.CANCELLED).length;
    if (planned === 0) {
      return 0;
    }
    const achieved = (milestones || []).filter(m => m.status === MilestoneStatus.ACHIEVED).length;
    return Math.round((achieved / planned) * 100);
  }

  getMilestoneCompletionRatio(milestones: MilestoneLike[]): string {
    const planned = (milestones || []).filter(m => m.status !== MilestoneStatus.CANCELLED).length;
    const achieved = (milestones || []).filter(m => m.status === MilestoneStatus.ACHIEVED).length;
    return `${achieved}/${planned}`;
  }

  private sortMilestonesForTimeline(milestones: MilestoneLike[]): MilestoneLike[] {
    return [...milestones].sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
  }

  getMilestoneStatusSeverity(status: string): 'success' | 'info' | 'warning' | 'danger' | undefined {
    switch (status) {
      case 'ACHIEVED': return 'success';
      case 'IN_PROGRESS': return 'info';
      case 'PENDING': return 'info';
      case 'MISSED': return 'danger';
      case 'CANCELLED': return 'warning';
      default: return 'info';
    }
  }

  deleteMilestone(milestone: Milestone): void {
    if (!this.canManageProjectMilestones()) {
      this.messageService.add({ severity: 'warn', summary: 'Unauthorized', detail: 'Project members can only consult projects' });
      return;
    }
    this.confirmationService.confirm({
      message: `Are you sure you want to delete the milestone "${milestone.title}"?`,
      header: 'Confirm Deletion',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        this.milestoneService.delete(milestone.id)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: () => {
              this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Milestone deleted' });
              if (this.selectedProject) {
                this.loadProjectMilestones(this.selectedProject.id);
              }
            },
            error: (err: any) => {
              console.error('Error deleting milestone', err);
              this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to delete milestone' });
            }
          });
      }
    });
  }
}
