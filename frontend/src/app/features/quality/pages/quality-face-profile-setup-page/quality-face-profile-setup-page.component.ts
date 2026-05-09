import { AfterViewInit, Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { MessageService } from 'primeng/api';
import * as faceapi from 'face-api.js';
import { FaceProfileResponse } from '../../models/quality.models';
import { QualityDataService } from '../../services/quality-data.service';

@Component({
  selector: 'app-quality-face-profile-setup-page',
  templateUrl: './quality-face-profile-setup-page.component.html',
  styleUrl: './quality-face-profile-setup-page.component.scss'
})
export class QualityFaceProfileSetupPageComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('videoElement') videoElement?: ElementRef<HTMLVideoElement>;

  modelsLoaded = false;
  cameraActive = false;
  cameraLoading = false;
  registering = false;
  userId: number | null = null;
  detectionStatus = 'Camera is not active';
  profileStatus: FaceProfileResponse | null = null;
  private stream?: MediaStream;
  private readonly modelPath = 'assets/models/face-api';

  constructor(
    private qualityDataService: QualityDataService,
    private messageService: MessageService,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.loadModels();
    this.route.queryParamMap.subscribe(params => {
      const userId = Number(params.get('userId'));
      if (userId && !Number.isNaN(userId)) {
        this.userId = userId;
        this.loadProfileStatus();
      }
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
      error: error => {
        this.profileStatus = null;
        this.messageService.add({
          severity: 'error',
          summary: 'Profile unavailable',
          detail: error?.error?.message || 'Could not load face profile status.'
        });
      }
    });
  }

  async saveProfile(): Promise<void> {
    if (!this.userId) {
      this.showMissingInput('Enter a user id before saving a face profile.');
      return;
    }

    const descriptor = await this.captureDescriptor();
    if (!descriptor) {
      return;
    }

    this.registering = true;
    this.qualityDataService.registerFaceProfile({
      userId: this.userId,
      faceDescriptor: descriptor
    }).subscribe({
      next: status => {
        this.profileStatus = status;
        this.registering = false;
        this.messageService.add({
          severity: 'success',
          summary: 'Face profile saved',
          detail: `Face descriptor was saved for user ${this.userId}.`
        });
      },
      error: error => {
        this.registering = false;
        this.messageService.add({
          severity: 'error',
          summary: 'Registration failed',
          detail: error?.error?.message || 'Face profile could not be saved.'
        });
      }
    });
  }

  getProfileBadgeClass(): string {
    return this.profileStatus?.hasProfile ? 'badge-active' : 'badge-pending';
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
