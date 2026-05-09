import { HttpErrorResponse } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed, fakeAsync, flushMicrotasks } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { of, throwError } from 'rxjs';
import { AiService } from '../../../core/services/ai.service';
import { AiChatComponent } from './ai-chat.component';

describe('AiChatComponent', () => {
  let component: AiChatComponent;
  let fixture: ComponentFixture<AiChatComponent>;
  let aiService: jasmine.SpyObj<AiService>;

  beforeEach(async () => {
    aiService = jasmine.createSpyObj<AiService>('AiService', ['chat', 'analyzePdf']);
    aiService.chat.and.returnValue(of({
      reply: 'ok',
      status: null,
      variance: null,
      recommendations: [],
      source: 'gemini'
    }));
    aiService.analyzePdf.and.returnValue(of({
      fileName: 'report.pdf',
      budget: null,
      expenses: null,
      summary: 'ok',
      analysis: 'ok',
      status: null,
      risks: [],
      recommendations: [],
      source: 'gemini'
    }));

    await TestBed.configureTestingModule({
      declarations: [AiChatComponent],
      imports: [CommonModule, ReactiveFormsModule],
      providers: [
        { provide: AiService, useValue: aiService }
      ],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();

    fixture = TestBed.createComponent(AiChatComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('accepts pdf files even when the browser omits the mime type', () => {
    const file = createPdfFile('statement.pdf', '');

    component.onPdfSelected(createFileChangeEvent(file));

    expect(aiService.analyzePdf).toHaveBeenCalledOnceWith(file);
    expect(component.errorMessage).toBe('');
  });

  it('rejects pdf files larger than 10 MB before uploading', () => {
    const file = createPdfFile('large-report.pdf', 'application/pdf', (10 * 1024 * 1024) + 1);

    component.onPdfSelected(createFileChangeEvent(file));

    expect(aiService.analyzePdf).not.toHaveBeenCalled();
    expect(component.errorMessage).toBe('PDF files must be 10 MB or smaller.');
  });

  it('shows a helpful message when the ai service is offline', fakeAsync(() => {
    aiService.analyzePdf.and.returnValue(throwError(() => new HttpErrorResponse({
      status: 0,
      statusText: 'Unknown Error'
    })));
    const file = createPdfFile('report.pdf');

    component.onPdfSelected(createFileChangeEvent(file));
    flushMicrotasks();

    expect(component.errorMessage).toContain('The AI analysis service is unreachable');
    expect(component.errorMessage).toContain('gemini-express-api');
  }));
});

function createPdfFile(name: string, type = 'application/pdf', size = 1024): File {
  const file = new File(['%PDF-1.4'], name, { type });
  Object.defineProperty(file, 'size', { value: size });
  return file;
}

function createFileChangeEvent(file: File): Event {
  const input = document.createElement('input');
  Object.defineProperty(input, 'files', {
    value: [file]
  });

  return {
    target: input
  } as unknown as Event;
}
