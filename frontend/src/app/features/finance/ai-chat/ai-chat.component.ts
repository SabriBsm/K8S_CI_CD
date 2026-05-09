import { AfterViewChecked, Component, ElementRef, ViewChild } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, FormGroup } from '@angular/forms';
import { finalize } from 'rxjs/operators';
import { AiChatResponse, ReportAnalysisResponse } from '../../../core/models/finance.model';
import { AiService } from '../../../core/services/ai.service';
import { environment } from '../../../../environments/environment';

type MessageSender = 'user' | 'ai';

interface ChatMessage {
  sender: MessageSender;
  text: string;
  status?: string | null;
  variance?: number | null;
  budget?: number | null;
  expenses?: number | null;
  risks?: string[];
  recommendations?: string[];
  fileName?: string | null;
}

@Component({
  selector: 'app-ai-chat',
  templateUrl: './ai-chat.component.html',
  styleUrl: './ai-chat.component.scss'
})
export class AiChatComponent implements AfterViewChecked {
  @ViewChild('scrollContainer') private scrollContainer?: ElementRef<HTMLDivElement>;
  private static readonly MAX_PDF_SIZE_BYTES = 10 * 1024 * 1024;

  readonly chatForm: FormGroup;
  messages: ChatMessage[] = [];
  sending = false;
  uploading = false;
  errorMessage = '';

  private shouldScroll = false;

  constructor(
    private readonly fb: FormBuilder,
    private readonly aiService: AiService
  ) {
    this.chatForm = this.fb.group({
      message: ['']
    });
  }

  get isBusy(): boolean {
    return this.sending || this.uploading;
  }

  ngAfterViewChecked(): void {
    if (!this.shouldScroll || !this.scrollContainer) {
      return;
    }

    const container = this.scrollContainer.nativeElement;
    container.scrollTop = container.scrollHeight;
    this.shouldScroll = false;
  }

  send(): void {
    const value = this.chatForm.getRawValue();
    const message = String(value.message ?? '').trim();

    if (!message) {
      return;
    }

    this.errorMessage = '';
    this.pushMessage({
      sender: 'user',
      text: message
    });

    this.sending = true;
    this.aiService.chat({ message })
      .pipe(finalize(() => { this.sending = false; }))
      .subscribe({
        next: (response) => {
          this.pushAiReply(response);
          this.chatForm.reset({ message: '' });
        },
        error: (error) => {
          this.errorMessage = error?.error?.message || 'Unable to contact the Gemini assistant.';
        }
      });
  }

  onPdfSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) {
      return;
    }

    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    if (!isPdf) {
      this.errorMessage = 'Only PDF files are allowed.';
      input.value = '';
      return;
    }

    if (file.size > AiChatComponent.MAX_PDF_SIZE_BYTES) {
      this.errorMessage = 'PDF files must be 10 MB or smaller.';
      input.value = '';
      return;
    }

    this.errorMessage = '';
    this.pushMessage({
      sender: 'user',
      text: 'Upload and analyze this financial report.',
      fileName: file.name
    });

    this.uploading = true;
    this.aiService.analyzePdf(file)
      .pipe(finalize(() => {
        this.uploading = false;
        input.value = '';
      }))
      .subscribe({
        next: (response) => {
          this.pushPdfAnalysis(response);
        },
        error: async (error: HttpErrorResponse) => {
          this.errorMessage = await this.extractErrorMessage(error, 'Unable to analyze the uploaded PDF.');
        }
      });
  }

  isAcceptable(status: string | null | undefined): boolean {
    return status === 'ACCEPTABLE';
  }

  private pushAiReply(response: AiChatResponse): void {
    this.pushMessage({
      sender: 'ai',
      text: response.reply,
      status: response.status,
      variance: response.variance,
      recommendations: response.recommendations
    });
  }

  private pushPdfAnalysis(response: ReportAnalysisResponse): void {
    this.pushMessage({
      sender: 'ai',
      text: response.summary || response.analysis,
      status: response.status,
      budget: response.budget,
      expenses: response.expenses,
      variance: response.budget != null && response.expenses != null ? response.budget - response.expenses : null,
      risks: response.risks,
      recommendations: response.recommendations
    });
  }

  private pushMessage(message: ChatMessage): void {
    this.messages = [...this.messages, message];
    this.shouldScroll = true;
  }

  private async extractErrorMessage(error: HttpErrorResponse, fallback: string): Promise<string> {
    const payload = error?.error;
    if (error.status === 0) {
      return this.buildOfflineMessage();
    }

    if (error.status === 413) {
      return 'PDF files must be 10 MB or smaller.';
    }

    if (payload?.message) {
      return payload.message;
    }

    if (payload?.error) {
      return payload.error;
    }

    if (typeof payload === 'string' && payload.trim()) {
      return payload;
    }

    if (payload instanceof Blob) {
      try {
        const text = await payload.text();
        const parsed = JSON.parse(text) as { message?: string; error?: string };
        return parsed.message || parsed.error || text || fallback;
      } catch {
        return payload.type === 'text/plain' ? await payload.text() : fallback;
      }
    }

    return fallback;
  }

  private buildOfflineMessage(): string {
    if (environment.production) {
      return 'The AI analysis service is currently unreachable. Please try again in a moment.';
    }

    return `The AI analysis service is unreachable at ${environment.apiAI}. Start the gemini-express-api service and try again.`;
  }
}
