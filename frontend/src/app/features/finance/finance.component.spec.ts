import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { AuthService } from '../../core/services/auth.service';
import { FinanceService } from '../../core/services/finance.service';
import { FinanceComponent } from './finance.component';

describe('FinanceComponent', () => {
  let component: FinanceComponent;
  let fixture: ComponentFixture<FinanceComponent>;
  let financeServiceSpy: jasmine.SpyObj<FinanceService>;
  let authServiceSpy: jasmine.SpyObj<AuthService>;

  beforeEach(async () => {
    financeServiceSpy = jasmine.createSpyObj<FinanceService>('FinanceService', [
      'getAllProjects',
      'getMyProjects',
      'getAllBudgets',
      'getAllExpenses',
      'getReports',
      'generateReport',
      'downloadReportPdf',
      'createBudget',
      'createExpense',
      'deleteBudget',
      'deleteExpense',
      'uploadPdfAnalysis',
      'getProjectAnalyses'
    ]);
    authServiceSpy = jasmine.createSpyObj<AuthService>('AuthService', ['getRole']);

    financeServiceSpy.getAllProjects.and.returnValue(of([]));
    financeServiceSpy.getMyProjects.and.returnValue(of([]));
    financeServiceSpy.getAllBudgets.and.returnValue(of([]));
    financeServiceSpy.getAllExpenses.and.returnValue(of([]));
    financeServiceSpy.getReports.and.returnValue(of([]));
    financeServiceSpy.generateReport.and.returnValue(of({
      id: 1,
      generatedAt: new Date().toISOString(),
      totalBudget: 0,
      totalExpenses: 0,
      variance: 0,
      summary: '',
      projectId: 1,
      projectName: 'Demo Project',
      clientName: 'Demo Client'
    }));
    financeServiceSpy.downloadReportPdf.and.returnValue(of(new Blob()));
    financeServiceSpy.createBudget.and.returnValue(of({
      id: 1,
      name: 'Budget',
      description: '',
      plannedAmount: 100,
      allocatedAmount: 100,
      startDate: null,
      endDate: null,
      projectId: 1,
      projectName: 'Demo Project'
    }));
    financeServiceSpy.createExpense.and.returnValue(of({
      id: 1,
      title: 'Expense',
      description: '',
      amount: 25,
      expenseDate: new Date().toISOString(),
      budgetId: 1,
      budgetName: 'Budget',
      projectId: 1
    }));
    financeServiceSpy.deleteBudget.and.returnValue(of(void 0));
    financeServiceSpy.deleteExpense.and.returnValue(of(void 0));
    financeServiceSpy.uploadPdfAnalysis.and.returnValue(of({
      fileName: 'report.pdf',
      budget: null,
      expenses: null,
      status: null,
      summary: 'ok',
      analysis: 'ok',
      risks: [],
      recommendations: [],
      source: 'gemini'
    }));
    financeServiceSpy.getProjectAnalyses.and.returnValue(of([]));
    authServiceSpy.getRole.and.returnValue('CUSTOMER');

    await TestBed.configureTestingModule({
      declarations: [FinanceComponent],
      providers: [
        { provide: FinanceService, useValue: financeServiceSpy },
        { provide: AuthService, useValue: authServiceSpy }
      ],
      schemas: [NO_ERRORS_SCHEMA]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FinanceComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
