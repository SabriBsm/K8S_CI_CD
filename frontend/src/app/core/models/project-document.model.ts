import { Project } from '../services/project.service';

export type ProjectDocumentType =
  | 'SPECIFICATIONS'
  | 'ARCHITECTURE'
  | 'DESIGN'
  | 'TEST_PLAN'
  | 'DOCUMENTATION'
  | 'RELEASE_NOTES'
  | 'OTHER';

export interface ProjectDocument {
  id: number;
  project?: Project;
  name: string;
  description?: string;
  fileUrl: string;
  type: ProjectDocumentType;
  version: string;
  uploadedBy: string;
  uploadedAt: string;
}

export interface ProjectDocumentForm {
  name: string;
  description: string;
  fileUrl: string;
  type: ProjectDocumentType;
  version: string;
  uploadedBy: string;
}

