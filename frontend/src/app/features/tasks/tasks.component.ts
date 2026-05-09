import { CdkDrag, CdkDragDrop, CdkDropList, moveItemInArray, transferArrayItem } from '@angular/cdk/drag-drop';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ConfirmationService, MessageService } from 'primeng/api';
import { Subject, of } from 'rxjs';
import { catchError, debounceTime, distinctUntilChanged, switchMap, takeUntil } from 'rxjs/operators';
import { AuthUser, UserRole } from '../../core/models/auth.model';
import { CreateTaskRequest, Task, TaskPageResponse, TaskPriority, TaskPrioritySource, TaskStatus, UpdateTaskRequest } from '../../core/models/task.model';
import { AuthService } from '../../core/services/auth.service';
import { RoleHelperService } from '../../core/services/role-helper.service';
import { DirectoryUser, TaskPriorityPreviewResponse, TaskProject, TaskQueryParams, TaskService } from './task.service';

interface Option<T> {
  label: string;
  value: T;
}

@Component({
  selector: 'app-tasks',
  templateUrl: './tasks.component.html',
  styleUrl: './tasks.component.scss'
})
export class TasksComponent implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();
  private readonly uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  readonly statuses: TaskStatus[] = ['TODO', 'IN_PROGRESS', 'DONE'];
  readonly statusLabels: Record<TaskStatus, string> = {
    TODO: 'To Do',
    IN_PROGRESS: 'In Progress',
    DONE: 'Done'
  };
  readonly statusOptions: Option<TaskStatus | ''>[] = [
    { label: 'All statuses', value: '' },
    { label: 'To Do', value: 'TODO' },
    { label: 'In Progress', value: 'IN_PROGRESS' },
    { label: 'Done', value: 'DONE' }
  ];
  readonly sortOptions: Option<string>[] = [
    { label: 'Board order', value: 'position,asc' },
    { label: 'Newest first', value: 'updatedAt,desc' },
    { label: 'Priority high to low', value: 'priority,desc' },
    { label: 'Title A-Z', value: 'title,asc' }
  ];
  readonly priorityOptions: Option<TaskPriority>[] = [
    { label: '🔥 High', value: 'HIGH' },
    { label: '⚡ Medium', value: 'MEDIUM' },
    { label: '🌿 Low', value: 'LOW' }
  ];

  projectId = '';
  project: TaskProject | null = null;
  tasks: Task[] = [];
  tasksByStatus: Record<TaskStatus, Task[]> = {
    TODO: [],
    IN_PROGRESS: [],
    DONE: []
  };
  projectMembers: DirectoryUser[] = [];
  taskPage: TaskPageResponse | null = null;
  loading = true;

  currentUser: AuthUser | null = null;
  role: UserRole | null = null;
  visibilityMessage = 'You are viewing all tasks for this project.';

  query: TaskQueryParams = {
    search: '',
    status: '',
    sort: 'position,asc',
    page: 0,
    size: 12
  };

  taskDialogVisible = false;
  assignDialogVisible = false;
  savingTask = false;
  assigningTask = false;
  analyzingTaskId: string | null = null;
  editingTask: Task | null = null;
  selectedTaskForAssignment: Task | null = null;
  aiPriorityPreview: TaskPriority | null = null;
  aiPrioritySource: TaskPrioritySource | null = null;
  aiPriorityLoading = false;

  taskForm: FormGroup;
  assignForm: FormGroup;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private fb: FormBuilder,
    private authService: AuthService,
    public roleHelperService: RoleHelperService,
    private taskService: TaskService,
    private messageService: MessageService,
    private confirmationService: ConfirmationService
  ) {
    this.taskForm = this.fb.group({
      title: ['', [Validators.required, Validators.minLength(3)]],
      description: [''],
      deadline: [null],
      status: ['TODO', Validators.required],
      assigneeId: [null],
      priorityOverrideEnabled: [false],
      manualPriority: ['MEDIUM']
    });

    this.assignForm = this.fb.group({
      assigneeId: [null, Validators.required]
    });
  }

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();
    this.role = this.authService.getRole();
    this.visibilityMessage = this.getVisibilityMessage();
    this.projectId = this.route.snapshot.queryParamMap.get('projectId')
      ?? this.route.snapshot.paramMap.get('id')
      ?? this.route.parent?.snapshot.paramMap.get('id')
      ?? '';

    if (!this.projectId) {
      this.loadFirstProject();
      return;
    }

    this.loadProject();
    this.loadProjectMembers();
    this.loadTasks();
    this.watchPriorityPreview();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get canManage(): boolean {
    return this.roleHelperService.isManager(this.role ?? this.currentUser?.role);
  }

  get canCreateTask(): boolean {
    const role = this.role ?? this.currentUser?.role;
    return this.roleHelperService.isManager(role) || this.roleHelperService.isClient(role);
  }

  get canInteractWithBoard(): boolean {
    return this.roleHelperService.isManager(this.role ?? this.currentUser?.role)
      || this.roleHelperService.isTeamMember(this.role ?? this.currentUser?.role);
  }

  loadProject(): void {
    this.taskService.getProject(this.projectId).subscribe({
      next: (project) => {
        this.project = project;
      }
    });
  }

  loadFirstProject(): void {
    this.loading = true;
    this.taskService.getProjects().subscribe({
      next: (projects) => {
        const requestedProjectName = this.route.snapshot.queryParamMap.get('projectName')?.trim().toLowerCase();
        const firstProject = requestedProjectName
          ? projects.find(project => project.name?.trim().toLowerCase() === requestedProjectName) ?? projects[0]
          : projects[0];
        if (!firstProject) {
          this.loading = false;
          return;
        }

        this.projectId = firstProject.id;
        this.project = firstProject;
        this.loadProjectMembers();
        this.loadTasks();
        this.watchPriorityPreview();
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  loadProjectMembers(): void {
    this.taskService.getProjectMembers().subscribe({
      next: (users) => {
        this.projectMembers = users;
      },
      error: (error) => {
        console.error('Failed to load project members', error);
        this.projectMembers = [];
      }
    });
  }

  loadTasks(): void {
    this.loading = true;
    this.taskService.getTasks(this.projectId, this.query).subscribe({
      next: (page) => {
        this.taskPage = page;
        this.tasks = page.content;
        this.groupTasks(page.content);
        this.loading = false;
      },
      error: () => {
        this.tasks = [];
        this.groupTasks([]);
        this.loading = false;
      }
    });
  }

  onSearch(value: string): void {
    this.query.search = value;
    this.query.page = 0;
    this.loadTasks();
  }

  onStatusFilterChange(value: TaskStatus | ''): void {
    this.query.status = value;
    this.query.page = 0;
    this.loadTasks();
  }

  onSortChange(value: string): void {
    this.query.sort = value;
    this.query.page = 0;
    this.loadTasks();
  }

  onPageChange(event: { page?: number; rows?: number }): void {
    this.query.page = event.page ?? 0;
    this.query.size = event.rows ?? this.query.size ?? 12;
    this.loadTasks();
  }

  goBackToProjects(): void {
    this.router.navigate(['/tasks']);
  }

  resetFilters(): void {
    this.query = {
      search: '',
      status: '',
      sort: 'position,asc',
      page: 0,
      size: this.query.size ?? 12
    };
    this.loadTasks();
  }

  openCreateDialog(status: TaskStatus = 'TODO'): void {
    if (!this.canCreateTask) {
      return;
    }

    this.editingTask = null;
    this.resetPriorityPreview();
    this.taskForm.reset({
      title: '',
      description: '',
      deadline: null,
      status,
      assigneeId: null,
      priorityOverrideEnabled: false,
      manualPriority: 'MEDIUM'
    });
    this.taskDialogVisible = true;
  }

  openEditDialog(task: Task): void {
    if (!this.canManage) {
      return;
    }

    this.editingTask = task;
    this.resetPriorityPreview();
    this.taskForm.reset({
      title: task.title,
      description: task.description ?? '',
      deadline: this.toDateTimeLocalValue(task.deadline),
      status: task.status,
      assigneeId: task.assigneeId ?? null,
      priorityOverrideEnabled: false,
      manualPriority: task.priority
    });
    this.taskDialogVisible = true;
  }

  saveTask(): void {
    if ((!this.canCreateTask && !this.editingTask) || (!this.canManage && this.editingTask) || this.taskForm.invalid) {
      this.taskForm.markAllAsTouched();
      return;
    }

    this.savingTask = true;
    const formValue = this.taskForm.getRawValue();
    const requestedStatus = formValue.status as TaskStatus;
    const isEditing = !!this.editingTask;
    const createPayload: CreateTaskRequest = {
      title: formValue.title,
      description: formValue.description,
      deadline: formValue.deadline || null,
      projectId: this.projectId,
      assigneeId: this.isUuid(formValue.assigneeId) ? formValue.assigneeId : null,
      priority: formValue.priorityOverrideEnabled ? formValue.manualPriority as TaskPriority : undefined
    };

    const request$ = this.editingTask
      ? this.taskService.updateTask(this.projectId, this.editingTask.id, {
          title: createPayload.title,
          description: createPayload.description,
          deadline: createPayload.deadline,
          status: requestedStatus,
          position: this.resolvePositionForSave(requestedStatus),
          projectId: createPayload.projectId,
          assigneeId: createPayload.assigneeId,
          priority: this.editingTask.priority
        } as UpdateTaskRequest)
      : this.taskService.createTask(this.projectId, createPayload);

    request$.subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: isEditing ? 'Task updated' : 'Task created',
          detail: isEditing ? 'The task changes were saved.' : 'A new task was added to the board.'
        });
        this.closeTaskDialog();
        this.savingTask = false;
        this.loadTasks();
      },
      error: () => {
        this.savingTask = false;
      }
    });
  }

  confirmDelete(task: Task): void {
    if (!this.canManage) {
      return;
    }

    this.confirmationService.confirm({
      header: 'Delete task',
      message: `Delete "${task.title}"?`,
      acceptButtonStyleClass: 'p-button-danger p-button-sm',
      accept: () => {
        this.taskService.deleteTask(this.projectId, task.id).subscribe({
          next: () => {
            this.messageService.add({
              severity: 'success',
              summary: 'Task deleted',
              detail: 'The task was removed from the board.'
            });
            this.loadTasks();
          }
        });
      }
    });
  }

  openAssignDialog(task: Task): void {
    if (!this.canManage) {
      return;
    }

    this.selectedTaskForAssignment = task;
    this.assignForm.reset({
      assigneeId: task.assigneeId ?? null
    });
    this.assignDialogVisible = true;
  }

  assignTask(): void {
    if (!this.canManage || this.assignForm.invalid || !this.selectedTaskForAssignment) {
      this.assignForm.markAllAsTouched();
      return;
    }

    this.assigningTask = true;
    const assigneeId = this.assignForm.value.assigneeId;
    if (!this.isUuid(assigneeId)) {
      this.assigningTask = false;
      this.messageService.add({
        severity: 'warn',
        summary: 'Invalid assignee',
        detail: 'Please select a valid team member from this project service.'
      });
      return;
    }

    this.taskService.assignTask(
      this.projectId,
      this.selectedTaskForAssignment.id,
      assigneeId
    ).subscribe({
      next: () => {
        this.assignDialogVisible = false;
        this.assigningTask = false;
        this.messageService.add({
          severity: 'success',
          summary: 'Assignee updated',
          detail: 'The task assignment has been saved.'
        });
        this.loadTasks();
      },
      error: () => {
        this.assigningTask = false;
      }
    });
  }

  canDragTask(task: Task): boolean {
    if (this.roleHelperService.isManager(this.role ?? this.currentUser?.role)) {
      return true;
    }

    return this.roleHelperService.isTeamMember(this.role ?? this.currentUser?.role)
      && !!this.currentUser?.id
      && task.assigneeId === String(this.currentUser.id);
  }

  canEnterColumn = (drag: CdkDrag<Task>, _drop: CdkDropList<Task[]>) => this.canDragTask(drag.data);

  onDrop(event: CdkDragDrop<Task[]>, nextStatus: TaskStatus): void {
    const movedTask = event.item.data;
    if (!this.canDragTask(movedTask)) {
      return;
    }

    if (event.previousContainer === event.container) {
      moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
      this.syncColumn(event.container.data, nextStatus);
    } else {
      transferArrayItem(
        event.previousContainer.data,
        event.container.data,
        event.previousIndex,
        event.currentIndex
      );
      this.syncColumn(event.previousContainer.data, this.resolveStatusFromListId(event.previousContainer.id));
      this.syncColumn(event.container.data, nextStatus);
    }

    this.taskService.updateTaskStatus(this.projectId, movedTask.id, {
      status: nextStatus,
      position: event.currentIndex
    }).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Board updated',
          detail: `"${movedTask.title}" moved to ${this.statusLabels[nextStatus]}.`
        });
        this.loadTasks();
      },
      error: () => this.loadTasks()
    });
  }

  getPriorityClass(priority: string): string {
    switch (priority) {
      case 'HIGH':
        return 'priority-high';
      case 'MEDIUM':
        return 'priority-medium';
      case 'LOW':
        return 'priority-low';
      default:
        return '';
    }
  }

  getPriorityLabel(priority: string): string {
    switch (priority) {
      case 'HIGH':
        return '\uD83D\uDD25 High';
      case 'MEDIUM':
        return '\u26A1 Medium';
      case 'LOW':
        return '\uD83C\uDF3F Low';
      default:
        return priority;
    }
  }

  getPriorityCardClass(priority: TaskPriority): string {
    return this.getPriorityClass(priority);
  }

  getTaskCardClass(task: Task): Record<string, boolean> {
    return {
      [this.getPriorityCardClass(task.priority)]: true,
      'deadline-overdue-card': this.isTaskOverdue(task)
    };
  }

  isTaskOverdue(task: Task): boolean {
    if (!task.deadline || task.status === 'DONE') {
      return false;
    }

    return new Date(task.deadline).getTime() < Date.now();
  }

  hasRendu(task: Task): boolean {
    return !!task.renduFileUrl;
  }

  canAnalyzeTask(task: Task): boolean {
    return this.canManage && this.hasRendu(task);
  }

  analyzeTask(task: Task): void {
    if (!this.canAnalyzeTask(task) || this.analyzingTaskId) {
      return;
    }

    this.analyzingTaskId = task.id;
    this.taskService.analyzeManual(task.id).subscribe({
      next: (result) => {
        task.aiSuggestion = result.aiSuggestion;
        task.aiScore = result.aiScore;
        task.aiConfidence = result.aiConfidence;
        task.aiExplanation = result.aiExplanation;
        this.analyzingTaskId = null;
        this.messageService.add({
          severity: 'success',
          summary: 'AI analysis ready',
          detail: `Suggestion for "${task.title}": ${result.aiSuggestion}.`
        });
      },
      error: () => {
        this.analyzingTaskId = null;
      }
    });
  }

  getSuggestionSourceClass(source: TaskPrioritySource | null): string {
    switch (source) {
      case 'KEYWORD':
        return 'suggestion-keyword';
      case 'AI':
        return 'suggestion-ai';
      case 'FALLBACK':
        return 'suggestion-fallback';
      case 'MANUAL':
        return 'suggestion-manual';
      default:
        return '';
    }
  }

  getSuggestionSourceLabel(source: TaskPrioritySource | null): string {
    switch (source) {
      case 'KEYWORD':
        return 'Keyword match';
      case 'AI':
        return 'AI fallback';
      case 'FALLBACK':
        return 'Safe fallback';
      case 'MANUAL':
        return 'Manual override';
      default:
        return '';
    }
  }

  isClient(): boolean {
    return this.roleHelperService.isClient(this.role ?? this.currentUser?.role);
  }

  trackByTaskId(_: number, task: Task): string {
    return task.id;
  }

  closeTaskDialog(): void {
    this.taskDialogVisible = false;
    this.editingTask = null;
    this.resetPriorityPreview();
  }

  get connectedDropLists(): string[] {
    return this.statuses.map(status => this.listId(status));
  }

  private groupTasks(tasks: Task[]): void {
    const grouped: Record<TaskStatus, Task[]> = {
      TODO: [],
      IN_PROGRESS: [],
      DONE: []
    };

    tasks.forEach(task => {
      grouped[task.status].push({ ...task });
    });

    this.statuses.forEach(status => {
      grouped[status].sort((a, b) => a.position - b.position);
    });

    this.tasksByStatus = grouped;
  }

  private syncColumn(tasks: Task[], status: TaskStatus): void {
    tasks.forEach((task, index) => {
      task.status = status;
      task.position = index;
    });
  }

  private resolveStatusFromListId(listId: string): TaskStatus {
    return listId.replace('list-', '') as TaskStatus;
  }

  private listId(status: TaskStatus): string {
    return `list-${status}`;
  }

  private resolvePositionForSave(status: TaskStatus): number {
    if (this.editingTask && this.editingTask.status === status) {
      return this.editingTask.position;
    }
    return this.tasksByStatus[status].length;
  }

  private getVisibilityMessage(): string {
    if (this.roleHelperService.isTeamMember(this.role ?? this.currentUser?.role)) {
      return 'You are viewing your assigned tasks.';
    }
    if (this.roleHelperService.isClient(this.role ?? this.currentUser?.role)) {
      return 'You are viewing your project tasks in read-only mode.';
    }
    return 'You are viewing all tasks for this project.';
  }

  private watchPriorityPreview(): void {
    this.taskForm.get('description')?.valueChanges.pipe(
      debounceTime(500),
      distinctUntilChanged(),
      switchMap((value: string | null) => {
        const description = value?.trim() ?? '';

        if (!this.canCreateTask || !!this.editingTask || !this.projectId || !description) {
          this.resetPriorityPreview();
          return of(null);
        }

        const localPreview = this.taskService.detectLocalPriority(description);
        if (localPreview) {
          this.aiPriorityLoading = false;
          this.aiPriorityPreview = localPreview.priority;
          this.aiPrioritySource = localPreview.source;
          return of(null);
        }

        this.aiPriorityLoading = true;
        return this.taskService.previewPriority(this.projectId, description).pipe(
          catchError(() => of({ priority: 'MEDIUM' as TaskPriority, source: 'FALLBACK' as TaskPrioritySource }))
        );
      }),
      takeUntil(this.destroy$)
    ).subscribe((response: TaskPriorityPreviewResponse | null) => {
      this.aiPriorityLoading = false;
      if (!response) {
        return;
      }

      this.aiPriorityPreview = response.priority;
      this.aiPrioritySource = response.source;
    });
  }

  private resetPriorityPreview(): void {
    this.aiPriorityPreview = null;
    this.aiPrioritySource = null;
    this.aiPriorityLoading = false;
  }

  private isUuid(value: unknown): value is string {
    return typeof value === 'string' && this.uuidPattern.test(value);
  }

  private toDateTimeLocalValue(value?: string | null): string | null {
    if (!value) {
      return null;
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return null;
    }
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  }
}
