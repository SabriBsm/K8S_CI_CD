import { AfterViewInit, Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import * as faceapi from 'face-api.js';
import {
  AuditIdentityVerificationLog,
  FaceProfileResponse,
  QualityAudit,
  VerifyAuditFaceResponse
} from '../../models/quality.models';
import { QualityDataService } from '../../services/quality-data.service';

@Component({
  selector: 'app-quality-face-verification-page',
  templateUrl: './quality-face-verification-page.component.html',
  styleUrl: './quality-face-verification-page.component.scss'
})
export class QualityFaceVerificationPageComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('videoElement') videoElement?: ElementRef<HTMLVideoElement>;

  modelsLoaded = false;
  cameraActive = false;
  cameraLoading = false;
  detectionStatus = 'Camera is not active';
  userId: number | null = null;
  selectedAuditId: number | null = null;
  selectedAudit: QualityAudit | null = null;
  audits: QualityAudit[] = [];
  logs: AuditIdentityVerificationLog[] = [];
  profileStatus: FaceProfileResponse | null = null;
  verifyResult: VerifyAuditFaceResponse | null = null;
  verifying = false;
  startingAudit = false;
  logsLoading = false;
  private stream?: MediaStream;
  private readonly modelPath = 'assets/models/face-api';

  constructor(
    private qualityDataService: QualityDataService,
    private messageService: MessageService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadModels();
    this.route.queryParamMap.subscribe(params => {
      const auditId = Number(params.get('auditId'));
      if (auditId && !Number.isNaN(auditId)) {
        this.selectedAuditId = auditId;
      }
      this.loadAudits();
    });
  }

  ngAfterViewInit(): void {
    if (this.videoElement?.nativeElement) {
      this.videoElement.nativeElement.muted = true;
    }
  }

  ngOnDestroy(): void {
    this.stopCamera();
  }

  loadAudits(): void {
    this.qualityDataService.getQualityAudits().subscribe({
      next: audits => {
        this.audits = audits;
        this.syncSelectedAudit();
        this.loadLogs();
      },
      error: () => this.audits = []
    });
  }

  onAuditChange(): void {
    this.verifyResult = null;
    this.syncSelectedAudit();
    this.loadLogs();
  }

  async loadModels(): Promise<void> {
    console.log('Loading models from:', 'assets/models/face-api');
    fetch('assets/models/face-api/tiny_face_detector_model-weights_manifest.json')
      .then(r => console.log('Model fetch status:', r.status))
      .catch(e => console.error('Model fetch failed', e));

    try {
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(this.modelPath).then(() => console.log('TinyFaceDetector loaded')),
        faceapi.nets.faceLandmark68Net.loadFromUri(this.modelPath).then(() => console.log('FaceLandmark loaded')),
        faceapi.nets.faceRecognitionNet.loadFromUri(this.modelPath).then(() => console.log('FaceRecognition loaded'))
      ]);
      this.modelsLoaded = true;
      this.detectionStatus = 'Models loaded successfully';
    } catch (error) {
      console.error('Model loading failed', error);
      this.modelsLoaded = false;
      this.detectionStatus = 'Face model files are missing or could not be loaded';
      this.messageService.add({
        severity: 'error',
        summary: 'Models unavailable',
        detail: 'Face model files could not be loaded from assets/models/face-api.'
      });
    }
  }

  async startCamera(): Promise<void> {
    if (!this.modelsLoaded) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Models loading',
        detail: 'Face recognition models are not ready yet.'
      });
      return;
    }

    this.cameraLoading = true;
    this.verifyResult = null;
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      if (this.videoElement?.nativeElement) {
        this.videoElement.nativeElement.srcObject = this.stream;
        await this.videoElement.nativeElement.play();
      }
      this.cameraActive = true;
      this.detectionStatus = 'Camera active. Align one face in the frame.';
      await this.updateDetectionStatus();
    } catch {
      this.messageService.add({
        severity: 'error',
        summary: 'Camera unavailable',
        detail: 'Browser camera access was denied or unavailable.'
      });
    } finally {
      this.cameraLoading = false;
    }
  }

  stopCamera(): void {
    this.stream?.getTracks().forEach(track => track.stop());
    this.stream = undefined;
    this.cameraActive = false;
    if (this.videoElement?.nativeElement) {
      this.videoElement.nativeElement.srcObject = null;
    }
    this.detectionStatus = this.modelsLoaded ? 'Models loaded successfully' : 'Camera is not active';
  }

  loadProfileStatus(): void {
    this.profileStatus = null;
    if (!this.userId) {
      return;
    }

    this.qualityDataService.getFaceProfileStatus(this.userId).subscribe({
      next: status => this.profileStatus = status,
      error: () => this.profileStatus = null
    });
  }

  async verifyAuditStart(): Promise<void> {
    if (!this.userId || !this.selectedAuditId) {
      this.showMissingInput('Select an audit and enter a user id before verification.');
      return;
    }

    if (this.profileStatus && !this.profileStatus.hasProfile) {
      this.messageService.add({
        severity: 'warn',
        summary: 'No face profile',
        detail: 'No face profile found. Please set up your face profile first.'
      });
      return;
    }

    const descriptor = await this.captureDescriptor();
    if (!descriptor) {
      return;
    }

    this.verifying = true;
    this.qualityDataService.verifyAuditStart({
      auditId: this.selectedAuditId,
      userId: this.userId,
      liveFaceDescriptor: descriptor
    }).subscribe({
      next: result => {
        this.verifyResult = result;
        this.verifying = false;
        this.messageService.add({
          severity: result.verified ? 'success' : 'warn',
          summary: result.verified ? 'Identity verified' : 'Verification failed',
          detail: result.message
        });
        this.loadLogs();
      },
      error: error => {
        this.verifying = false;
        this.messageService.add({
          severity: 'error',
          summary: 'Verification failed',
          detail: error?.error?.message || 'Audit verification could not be completed.'
        });
      }
    });
  }

  startAudit(): void {
    if (!this.selectedAuditId || !this.userId) {
      this.showMissingInput('Select an audit and enter a user id before starting.');
      return;
    }

    this.startingAudit = true;
    this.qualityDataService.startQualityAudit(this.selectedAuditId, this.userId).subscribe({
      next: audit => {
        this.startingAudit = false;
        this.messageService.add({
          severity: 'success',
          summary: 'Audit started',
          detail: `${audit.title} is now in progress.`
        });
        this.router.navigate(['/quality/checklist-items'], { queryParams: { auditId: audit.id } });
      },
      error: error => {
        this.startingAudit = false;
        this.messageService.add({
          severity: 'error',
          summary: 'Start blocked',
          detail: error?.error?.message || 'Face verification is required before starting this audit.'
        });
      }
    });
  }

  goToProfileSetup(): void {
    this.router.navigate(['/quality/face-profile-setup'], { queryParams: { userId: this.userId || undefined } });
  }

  loadLogs(): void {
    if (!this.selectedAuditId) {
      this.logs = [];
      return;
    }

    this.logsLoading = true;
    this.qualityDataService.getAuditVerificationLogs(this.selectedAuditId).subscribe({
      next: logs => {
        this.logs = logs;
        this.logsLoading = false;
      },
      error: () => {
        this.logs = [];
        this.logsLoading = false;
      }
    });
  }

  getResultClass(verified?: boolean): string {
    return verified ? 'verification-success' : 'verification-failed';
  }

  formatDistance(value?: number | null): string {
    return value === null || value === undefined ? 'N/A' : value.toFixed(4);
  }

  get noFaceProfileFound(): boolean {
    return this.profileStatus?.hasProfile === false
      || (!!this.verifyResult && !this.verifyResult.verified && this.verifyResult.message?.toLowerCase().includes('no face profile'));
  }

  private syncSelectedAudit(): void {
    this.selectedAudit = this.audits.find(audit => audit.id === this.selectedAuditId) ?? null;
  }

  private async captureDescriptor(): Promise<number[] | null> {
    if (!this.videoElement?.nativeElement || !this.cameraActive) {
      this.showMissingInput('Start the webcam before capturing a face.');
      return null;
    }

    const detections = await faceapi
      .detectAllFaces(this.videoElement.nativeElement, new faceapi.TinyFaceDetectorOptions())
      .withFaceLandmarks()
      .withFaceDescriptors();

    if (!detections.length) {
      this.detectionStatus = 'No face detected';
      this.messageService.add({ severity: 'warn', summary: 'No face detected', detail: 'Align your face and try again.' });
      return null;
    }

    if (detections.length > 1) {
      this.detectionStatus = 'Multiple faces detected';
      this.messageService.add({ severity: 'warn', summary: 'Multiple faces', detail: 'Only one face should be visible.' });
      return null;
    }

    this.detectionStatus = 'Face detected';
    return Array.from(detections[0].descriptor);
  }

  private async updateDetectionStatus(): Promise<void> {
    if (!this.videoElement?.nativeElement || !this.cameraActive) {
      return;
    }

    const detections = await faceapi.detectAllFaces(
      this.videoElement.nativeElement,
      new faceapi.TinyFaceDetectorOptions()
    );

    if (!detections.length) {
      this.detectionStatus = 'No face detected';
    } else if (detections.length > 1) {
      this.detectionStatus = 'Multiple faces detected';
    } else {
      this.detectionStatus = 'Face detected';
    }
  }

  private showMissingInput(detail: string): void {
    this.messageService.add({
      severity: 'warn',
      summary: 'Missing input',
      detail
    });
  }
}
