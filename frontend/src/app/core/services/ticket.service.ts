import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Ticket, TicketCategory, TicketPriority, TicketResponse, TicketStatus, TicketSummary } from '../models/ticket.model';

@Injectable({ providedIn: 'root' })
export class TicketService {
  private readonly ticketUrl   = `${environment.ticketApiUrl}/ticket`;
  private readonly responseUrl = `${environment.ticketApiUrl}/response`;

  constructor(private http: HttpClient) {}

  // ── Ticket CRUD ──────────────────────────────────────────────
  getAllTickets(): Observable<Ticket[]> {
    return this.http.get<Ticket[]>(`${this.ticketUrl}/getAll`);
  }

  getTicketById(id: number): Observable<Ticket> {
    return this.http.get<Ticket>(`${this.ticketUrl}/getTicket/${id}`);
  }

  getTicketByReference(reference: string): Observable<Ticket> {
    return this.http.get<Ticket>(`${this.ticketUrl}/getByReference/${reference}`);
  }

  createTicket(ticket: Ticket, username?: string): Observable<Ticket> {
    const headers = username ? new HttpHeaders({ 'X-Username': username }) : undefined;
    return this.http.post<Ticket>(`${this.ticketUrl}/addTicket`, ticket, { headers });
  }

  updateTicket(ticket: Ticket): Observable<Ticket> {
    return this.http.put<Ticket>(`${this.ticketUrl}/updateTicket`, ticket);
  }

  updateTicketAsUser(ticket: Ticket, username?: string): Observable<Ticket> {
    const headers = username ? new HttpHeaders({ 'X-Username': username }) : undefined;
    return this.http.put<Ticket>(`${this.ticketUrl}/updateTicket`, ticket, { headers });
  }

  deleteTicket(id: number): Observable<void> {
    return this.http.delete<void>(`${this.ticketUrl}/deleteTicket/${id}`);
  }

  deleteTicketAsUser(id: number, username?: string): Observable<void> {
    const headers = username ? new HttpHeaders({ 'X-Username': username }) : undefined;
    return this.http.delete<void>(`${this.ticketUrl}/deleteTicket/${id}`, { headers });
  }

  // ── Filters ──────────────────────────────────────────────────
  getByStatus(status: TicketStatus): Observable<Ticket[]> {
    return this.http.get<Ticket[]>(`${this.ticketUrl}/getByStatus/${status}`);
  }

  getByPriority(priority: TicketPriority): Observable<Ticket[]> {
    return this.http.get<Ticket[]>(`${this.ticketUrl}/getByPriority/${priority}`);
  }

  getByCategory(category: TicketCategory): Observable<Ticket[]> {
    return this.http.get<Ticket[]>(`${this.ticketUrl}/getByCategory/${category}`);
  }

  updateStatus(id: number, status: TicketStatus): Observable<Ticket> {
    return this.http.patch<Ticket>(`${this.ticketUrl}/updateStatus/${id}/${status}`, {});
  }

  updateStatusAsUser(id: number, status: TicketStatus, username?: string): Observable<Ticket> {
    const headers = username ? new HttpHeaders({ 'X-Username': username }) : undefined;
    return this.http.patch<Ticket>(`${this.ticketUrl}/updateStatus/${id}/${status}`, {}, { headers });
  }

  // ── Users (dropdown assignedTo / submittedTo) ─────────────────
  getUsers(): Observable<any[]> {
    return this.http.get<any[]>(`${this.ticketUrl}/users`);
  }

  // ── Responses ────────────────────────────────────────────────
  getResponsesByTicket(ticketId: number): Observable<TicketResponse[]> {
    return this.http.get<TicketResponse[]>(`${this.responseUrl}/getByTicket/${ticketId}`);
  }

  addResponse(ticketId: number, response: TicketResponse, username?: string): Observable<TicketResponse> {
    const headers = username ? new HttpHeaders({ 'X-Username': username }) : undefined;
    return this.http.post<TicketResponse>(`${this.responseUrl}/addResponse/${ticketId}`, response, { headers });
  }

  updateResponse(response: TicketResponse): Observable<TicketResponse> {
    return this.http.put<TicketResponse>(`${this.responseUrl}/updateResponse`, response);
  }

  uploadAttachment(file: File): Observable<{ url: string; originalName: string; size: string }> {
    const form = new FormData();
    form.append('file', file);
    return this.http.post<{ url: string; originalName: string; size: string }>(
      `${this.responseUrl}/upload`, form
    );
  }

  deleteResponse(id: number): Observable<void> {
    return this.http.delete<void>(`${this.responseUrl}/deleteResponse/${id}`);
  }

  // ── Summary ──────────────────────────────────────────────────
  getSummary(ticketId: number): Observable<TicketSummary> {
    return this.http.get<TicketSummary>(`${this.ticketUrl}/${ticketId}/summary`);
  }

  generateSummary(ticketId: number): Observable<TicketSummary> {
    return this.http.post<TicketSummary>(`${this.ticketUrl}/${ticketId}/summary/generate`, {});
  }
}
