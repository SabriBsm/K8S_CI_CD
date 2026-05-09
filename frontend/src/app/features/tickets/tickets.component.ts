import { Component, OnInit, ViewChild } from '@angular/core';
import jsPDF from 'jspdf';
import { environment } from '../../../environments/environment';
import { ConfirmationService, MessageService } from 'primeng/api';
import { Ticket, TicketCategory, TicketPriority, TicketResponse, TicketStatus, TicketSummary } from '../../core/models/ticket.model';
import { TicketService } from '../../core/services/ticket.service';
import { AuthService } from '../../core/services/auth.service';
import { ChannelService } from '../../core/services/channel.service';
import { VoicePanelComponent } from '../channels/voice-panel/voice-panel.component';
import { WebRtcSignal } from '../../core/models/channel.model';
import { AiService } from '../../core/services/ai.service';

@Component({
  selector: 'app-tickets',
  templateUrl: './tickets.component.html',
  styleUrl: './tickets.component.scss'
})
export class TicketsComponent implements OnInit {
  @ViewChild('voicePanel') voicePanel?: VoicePanelComponent;

  tickets: Ticket[] = [];
  filteredTickets: Ticket[] = [];
  loading = false;

  ticketDialog  = false;
  detailDialog  = false;
  selectedTicket: Ticket | null = null;
  responses: TicketResponse[] = [];
  newResponse = '';
  currentUser = 'anonymous';
  currentActor = 'anonymous';
  currentEmail = '';
  currentLoginName = '';
  channelId: number | null = null;

  generatingAi = false;
  aiContext     = '';

  summary: TicketSummary | null = null;
  loadingSummary    = false;
  generatingSummary = false;

  editingResponseId: number | null = null;
  editingContent    = '';

  selectedFile: File | null = null;
  uploading = false;
  readonly serverBase = environment.ticketApiUrl.replace('/api', '');

  ticketForm: Partial<Ticket> = {};
  isEditMode = false;

  searchText     = '';
  filterStatus:   TicketStatus   | null = null;
  filterPriority: TicketPriority | null = null;
  filterCategory: TicketCategory | null = null;

  // Liste déroulante des utilisateurs (assignedTo / submittedTo)
  usersOptions: { label: string; value: string }[] = [];
  private usersRaw: any[] = [];

  statusOptions: { label: string; value: TicketStatus }[] = [
    { label: 'New',         value: 'NEW' },
    { label: 'In Progress', value: 'IN_PROGRESS' },
    { label: 'On Hold',     value: 'ON_HOLD' },
    { label: 'Resolved',    value: 'RESOLVED' },
    { label: 'Closed',      value: 'CLOSED' }
  ];

  priorityOptions = [
    { label: 'Low',      value: 'LOW' },
    { label: 'Medium',   value: 'MEDIUM' },
    { label: 'High',     value: 'HIGH' },
    { label: 'Critical', value: 'CRITICAL' }
  ];

  categoryOptions = [
    { label: 'Incident',        value: 'INCIDENT' },
    { label: 'Service Request', value: 'SERVICE_REQUEST' },
    { label: 'Bug',             value: 'BUG' },
    { label: 'Change Request',  value: 'CHANGE_REQUEST' }
  ];

  constructor(
    private ticketService: TicketService,
    private messageService: MessageService,
    private confirmationService: ConfirmationService,
    private authService: AuthService,
    private channelService: ChannelService,
    private aiService: AiService
  ) {}

  ngOnInit(): void {
    const user = this.authService.getCurrentUser();
    this.currentEmail = (user?.email || '').toLowerCase();
    this.currentLoginName = this.currentEmail.includes('@')
      ? this.currentEmail.split('@')[0]
      : this.currentEmail;
    this.currentUser = user?.email || 'anonymous';
    this.currentActor = this.currentUser;
    this.loadTickets();
    this.loadUsers();
  }

  loadTickets(): void {
    this.loading = true;
    this.ticketService.getAllTickets().subscribe({
      next: (data) => {
        this.tickets = data;
        this.applyFilters();
        this.loading = false;
      },
      error: () => {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to load tickets' });
        this.loading = false;
      }
    });
  }

  loadUsers(): void {
    this.ticketService.getUsers().subscribe({
      next: (users) => {
        this.usersRaw = users || [];
        this.usersOptions = users.map(u => ({
          label: `${u.firstName || ''} ${u.lastName || ''} (${u.username})`.trim(),
          value: u.username
        }));
        this.resolveCurrentActor();
      },
      error: () => {}
    });
  }

  private resolveCurrentActor(): void {
    if (!this.usersRaw?.length) return;
    const byEmail = this.usersRaw.find(u =>
      !!u?.email && String(u.email).toLowerCase() === this.currentEmail
    );
    if (byEmail?.username) {
      this.currentActor = byEmail.username;
      return;
    }
    const byUsername = this.usersRaw.find(u =>
      !!u?.username && String(u.username).toLowerCase() === this.currentEmail
    );
    if (byUsername?.username) {
      this.currentActor = byUsername.username;
    }
  }

  applyFilters(): void {
    this.filteredTickets = this.tickets.filter(t => {
      const matchSearch   = !this.searchText || t.title.toLowerCase().includes(this.searchText.toLowerCase()) || t.reference.toLowerCase().includes(this.searchText.toLowerCase());
      const matchStatus   = !this.filterStatus   || t.status   === this.filterStatus;
      const matchPriority = !this.filterPriority || t.priority === this.filterPriority;
      const matchCategory = !this.filterCategory || t.category === this.filterCategory;
      return matchSearch && matchStatus && matchPriority && matchCategory;
    });
  }

  clearFilters(): void {
    this.searchText     = '';
    this.filterStatus   = null;
    this.filterPriority = null;
    this.filterCategory = null;
    this.applyFilters();
  }

  get totalCount():    number { return this.tickets.length; }
  get openCount():     number { return this.tickets.filter(t => t.status === 'NEW' || t.status === 'IN_PROGRESS').length; }
  get resolvedCount(): number { return this.tickets.filter(t => t.status === 'RESOLVED' || t.status === 'CLOSED').length; }
  get criticalCount(): number { return this.tickets.filter(t => t.priority === 'CRITICAL').length; }

  openNew(): void {
    // submittedBy est pré-rempli automatiquement avec l'utilisateur connecté
    this.ticketForm  = { priority: 'MEDIUM', category: 'BUG', submittedBy: this.currentActor };
    this.isEditMode  = false;
    this.ticketDialog = true;
  }

  openEdit(ticket: Ticket): void {
    this.ticketForm  = { ...ticket };
    this.isEditMode  = true;
    this.ticketDialog = true;
  }

  saveTicket(): void {
    if (!this.ticketForm.title) {
      this.messageService.add({ severity: 'warn', summary: 'Validation', detail: 'Title is required' });
      return;
    }
    // submittedBy auto depuis l'utilisateur connecté
    if (!this.ticketForm.submittedBy) {
      this.ticketForm.submittedBy = this.currentActor;
    }

    if (this.ticketForm.dueDate && typeof this.ticketForm.dueDate !== 'string') {
      const d = this.ticketForm.dueDate as unknown as Date;
      this.ticketForm.dueDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }

    const op$ = this.isEditMode
      ? this.ticketService.updateTicketAsUser(this.ticketForm as Ticket, this.currentActor)
      : this.ticketService.createTicket(this.ticketForm as Ticket, this.currentActor);

    op$.subscribe({
      next: () => {
        this.messageService.add({ severity: 'success', summary: 'Success', detail: `Ticket ${this.isEditMode ? 'updated' : 'created'}` });
        this.ticketDialog = false;
        this.loadTickets();
      },
      error: () => this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Operation failed' })
    });
  }

  openDetail(ticket: Ticket): void {
    this.selectedTicket    = ticket;
    this.newResponse       = '';
    this.responses         = [];
    this.summary           = null;
    this.editingResponseId = null;
    this.selectedFile      = null;
    this.uploading         = false;
    this.channelId         = null;
    this.detailDialog      = true;
    this.ticketService.getResponsesByTicket(ticket.id!).subscribe({
      next: (r) => this.responses = r,
      error: () => {}
    });
    this.channelService.getChannelByTicket(ticket.id!).subscribe({
      next: (ch) => this.channelId = ch.id,
      error: () => {}
    });
  }

  readonly handleVoiceSignal = (sig: WebRtcSignal): void => {
    this.voicePanel?.handleSignal(sig);
  };

  onDetailHide(): void {
    this.selectedTicket = null;
    this.channelId = null;
    this.aiContext = '';
    this.summary = null;
  }

  downloadSummaryPdf(): void {
    if (!this.selectedTicket?.id) return;
    this.generatingSummary = true;

    const load = (s: TicketSummary) => {
      this.generatingSummary = false;
      this.buildAndDownloadPdf(s);
    };

    const fallback = () => {
      this.ticketService.generateSummary(this.selectedTicket!.id!).subscribe({
        next: load,
        error: () => {
          this.generatingSummary = false;
          this.messageService.add({ severity: 'error', summary: 'Erreur', detail: 'Impossible de générer le rapport.' });
        }
      });
    };

    this.ticketService.getSummary(this.selectedTicket.id).subscribe({ next: load, error: fallback });
  }

  private buildAndDownloadPdf(s: TicketSummary): void {
    const t = this.selectedTicket!;
    const doc = new jsPDF();
    const pageW = doc.internal.pageSize.getWidth();
    const margin = 18;
    const contentW = pageW - margin * 2;
    let y = 20;

    const addWrappedText = (text: string, x: number, startY: number, maxW: number, lineH: number): number => {
      const lines = doc.splitTextToSize(text, maxW);
      doc.text(lines, x, startY);
      return startY + lines.length * lineH;
    };

    doc.setFillColor(30, 27, 75);
    doc.rect(0, 0, pageW, 28, 'F');
    doc.setTextColor(165, 180, 252);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('Rapport de Resolution - PlanSync Pro', margin, 18);
    y = 40;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text(`Reference : ${t.reference}   |   Priorite : ${t.priority}   |   Categorie : ${t.category}`, margin, y);
    y += 6;
    doc.text(`Soumis par : ${t.submittedBy}   |   Assigne a : ${t.assignedTo || '-'}   |   Resolu le : ${t.resolvedAt ? new Date(t.resolvedAt).toLocaleDateString('fr-FR') : '-'}`, margin, y);
    y += 10;

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 27, 75);
    y = addWrappedText(t.title, margin, y, contentW, 7);
    y += 6;

    doc.setDrawColor(200, 200, 220);
    doc.line(margin, y, pageW - margin, y);
    y += 8;

    const section = (label: string, content: string) => {
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(67, 56, 202);
      doc.text(label, margin, y);
      y += 6;
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(50, 50, 50);
      doc.setFontSize(10);
      y = addWrappedText(content || '-', margin + 4, y, contentW - 4, 5.5);
      y += 8;
    };

    section('PROBLEME', s.problemSummary);
    section('ETAPES DE RESOLUTION', s.resolutionSteps);
    section('SOLUTION FINALE', s.finalSolution);

    if (s.suggestedTags) {
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(67, 56, 202);
      doc.text('TAGS', margin, y);
      y += 6;
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(80, 80, 80);
      doc.text(s.suggestedTags, margin + 4, y);
      y += 10;
    }

    doc.setDrawColor(200, 200, 220);
    doc.line(margin, y, pageW - margin, y);
    y += 6;
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(`Genere le ${new Date().toLocaleDateString('fr-FR')} - PlanSync Pro - Rapport IA (${s.model || 'llama-3.1'})`, margin, y);

    doc.save(`rapport-${t.reference}.pdf`);
    this.messageService.add({ severity: 'success', summary: 'PDF téléchargé', detail: `rapport-${t.reference}.pdf` });
  }

  generateAiResponse(): void {
    if (!this.selectedTicket) return;
    this.generatingAi = true;

    const previousResponses = this.responses.map(r => r.content).slice(-3);

    this.aiService.generateTicketResponse({
      ticketId:          this.selectedTicket.id,
      title:             this.selectedTicket.title,
      description:       this.selectedTicket.description,
      category:          this.selectedTicket.category,
      priority:          this.selectedTicket.priority,
      status:            this.selectedTicket.status,
      submittedBy:       this.selectedTicket.submittedBy,
      assignedTo:        this.selectedTicket.assignedTo,
      previousResponses,
      additionalContext: this.aiContext
    }).subscribe({
      next: (res) => {
        this.newResponse  = res.generatedText;
        this.generatingAi = false;
        this.messageService.add({ severity: 'success', summary: '✨ IA', detail: `Réponse générée (${res.tokensUsed} tokens · ${res.model})` });
      },
      error: () => {
        this.generatingAi = false;
        this.messageService.add({ severity: 'error', summary: 'Erreur IA', detail: 'Impossible de générer une réponse. Vérifiez votre clé API Groq.' });
      }
    });
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.selectedFile = input.files?.[0] ?? null;
  }

  clearFile(): void { this.selectedFile = null; }

  submitResponse(): void {
    if (!this.newResponse.trim() || !this.selectedTicket?.id) return;
    if (!this.canRespond(this.selectedTicket)) {
      this.messageService.add({ severity: 'warn', summary: 'Forbidden', detail: 'You are not allowed to respond to this ticket' });
      return;
    }

    if (this.selectedFile) {
      this.uploading = true;
      this.ticketService.uploadAttachment(this.selectedFile).subscribe({
        next: ({ url }) => { this.uploading = false; this.sendResponse(url); },
        error: () => {
          this.uploading = false;
          this.messageService.add({ severity: 'error', summary: 'Upload failed', detail: 'Could not upload the file' });
        }
      });
    } else {
      this.sendResponse();
    }
  }

  private sendResponse(attachmentUrl?: string): void {
    const payload: TicketResponse = {
      content: this.newResponse,
      respondedBy: this.currentActor,
      attachment: attachmentUrl
    };
    // respondedBy est aussi envoyé via l'en-tête X-Username côté backend
    this.ticketService.addResponse(this.selectedTicket!.id!, payload, this.currentActor).subscribe({
      next: (r) => {
        this.responses.push(r);
        this.newResponse  = '';
        this.selectedFile = null;
        this.messageService.add({ severity: 'success', summary: 'Response added' });
      },
      error: () => this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to add response' })
    });
  }

  getAttachmentUrl(path: string): string { return this.serverBase + path; }

  attachmentName(path: string): string {
    return path.split('/').pop()?.replace(/^[0-9a-f-]{36}_/, '') ?? path;
  }

  startEditResponse(r: TicketResponse): void {
    this.editingResponseId = r.id!;
    this.editingContent    = r.content;
  }

  cancelEditResponse(): void {
    this.editingResponseId = null;
    this.editingContent    = '';
  }

  saveEditResponse(r: TicketResponse): void {
    if (!this.editingContent.trim()) return;
    const updated: TicketResponse = { ...r, content: this.editingContent };
    this.ticketService.updateResponse(updated).subscribe({
      next: (saved: TicketResponse) => {
        const idx = this.responses.findIndex(x => x.id === r.id);
        if (idx !== -1) this.responses[idx] = saved;
        this.cancelEditResponse();
        this.messageService.add({ severity: 'success', summary: 'Response updated' });
      },
      error: () => this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Update failed' })
    });
  }

  deleteResponse(r: TicketResponse): void {
    this.confirmationService.confirm({
      message: 'Delete this response?',
      header: 'Confirm',
      icon: 'pi pi-exclamation-triangle',
      acceptButtonStyleClass: 'p-button-danger p-button-sm',
      rejectButtonStyleClass: 'p-button-text p-button-sm',
      accept: () => {
        this.ticketService.deleteResponse(r.id!).subscribe({
          next: () => {
            this.responses = this.responses.filter(x => x.id !== r.id);
            this.messageService.add({ severity: 'success', summary: 'Response deleted' });
          },
          error: () => this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Delete failed' })
        });
      }
    });
  }

  changeStatus(ticket: Ticket, status: TicketStatus): void {
    if (!this.isCreator(ticket)) {
      this.messageService.add({ severity: 'warn', summary: 'Forbidden', detail: 'Only creator can change status' });
      return;
    }

    this.ticketService.updateStatusAsUser(ticket.id!, status, this.currentActor).subscribe({
      next: (updated) => {
        const idx = this.tickets.findIndex(t => t.id === ticket.id);
        if (idx !== -1) this.tickets[idx] = updated;
        if (this.selectedTicket?.id === ticket.id) this.selectedTicket = updated;
        this.applyFilters();
        this.messageService.add({ severity: 'success', summary: 'Status updated' });
      },
      error: () => this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Status update failed' })
    });
  }

  deleteTicket(ticket: Ticket): void {
    if (!this.isCreator(ticket)) {
      this.messageService.add({ severity: 'warn', summary: 'Forbidden', detail: 'Only creator can delete ticket' });
      return;
    }

    this.confirmationService.confirm({
      message: `Delete ticket <strong>${ticket.reference}</strong>?`,
      header: 'Confirm Delete',
      icon: 'pi pi-exclamation-triangle',
      acceptButtonStyleClass: 'p-button-danger p-button-sm',
      rejectButtonStyleClass: 'p-button-text p-button-sm',
      accept: () => {
        this.ticketService.deleteTicketAsUser(ticket.id!, this.currentActor).subscribe({
          next: () => {
            this.tickets = this.tickets.filter(t => t.id !== ticket.id);
            this.applyFilters();
            this.messageService.add({ severity: 'success', summary: 'Deleted', detail: 'Ticket removed' });
          },
          error: () => this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Delete failed' })
        });
      }
    });
  }

  statusSeverity(status: TicketStatus): 'success' | 'secondary' | 'info' | 'warning' | 'danger' | 'contrast' {
    const map: Record<TicketStatus, 'success' | 'secondary' | 'info' | 'warning' | 'danger' | 'contrast'> = {
      NEW: 'info', IN_PROGRESS: 'warning', ON_HOLD: 'secondary', RESOLVED: 'success', CLOSED: 'contrast'
    };
    return map[status];
  }

  prioritySeverity(priority: TicketPriority): 'success' | 'secondary' | 'info' | 'warning' | 'danger' | 'contrast' {
    const map: Record<TicketPriority, 'success' | 'secondary' | 'info' | 'warning' | 'danger' | 'contrast'> = {
      LOW: 'secondary', MEDIUM: 'info', HIGH: 'warning', CRITICAL: 'danger'
    };
    return map[priority];
  }

  statusLabel(status: TicketStatus): string { return status.replace('_', ' '); }
  categoryLabel(category: TicketCategory): string { return category.replace('_', ' '); }

  private readonly transitions: Record<TicketStatus, TicketStatus[]> = {
    NEW:         ['IN_PROGRESS', 'ON_HOLD', 'CLOSED'],
    IN_PROGRESS: ['ON_HOLD', 'RESOLVED', 'CLOSED'],
    ON_HOLD:     ['IN_PROGRESS', 'CLOSED'],
    RESOLVED:    ['CLOSED', 'IN_PROGRESS'],
    CLOSED:      []
  };

  isClosed(ticket: Ticket): boolean { return ticket.status === 'CLOSED'; }

  nextStatusOptions(current: TicketStatus) {
    return this.statusOptions.filter(o => this.transitions[current].includes(o.value));
  }

  isCreator(ticket: Ticket): boolean {
    return this.matchesCurrentIdentity(ticket?.submittedBy);
  }

  canRespond(ticket: Ticket): boolean {
    const isAssigned = this.matchesCurrentIdentity(ticket?.assignedTo);
    return this.isCreator(ticket) || isAssigned;
  }

  private matchesCurrentIdentity(value?: string): boolean {
    if (!value) return false;
    const v = value.toLowerCase().trim();
    const actor = (this.currentActor || '').toLowerCase().trim();
    const user = (this.currentUser || '').toLowerCase().trim();
    const email = (this.currentEmail || '').toLowerCase().trim();
    const login = (this.currentLoginName || '').toLowerCase().trim();
    return v === actor || v === user || v === email || v === login;
  }
}
