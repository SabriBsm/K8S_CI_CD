/// <reference types="jasmine" />

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { of } from 'rxjs';
import { ConfirmationService, MessageService } from 'primeng/api';
import { RiskService } from '../../core/services';

import { RisksComponent } from './risks.component';

describe('RisksComponent', () => {
  let component: RisksComponent;
  let fixture: ComponentFixture<RisksComponent>;
  let riskServiceSpy: jasmine.SpyObj<RiskService>;

  beforeEach(async () => {
    riskServiceSpy = jasmine.createSpyObj<RiskService>('RiskService', [
      'getRisks',
      'createRisk',
      'updateRisk',
      'deleteRisk',
      'createMitigation',
      'updateMitigation',
      'deleteMitigation'
    ]);
    riskServiceSpy.getRisks.and.returnValue(of([]));

    await TestBed.configureTestingModule({
      declarations: [RisksComponent],
      imports: [ReactiveFormsModule],
      providers: [
        MessageService,
        ConfirmationService,
        { provide: RiskService, useValue: riskServiceSpy }
      ],
      schemas: [NO_ERRORS_SCHEMA]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RisksComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
