import { client } from '../client';
import { endpoints } from '../endpoints';

export type DocumentTypeKey = 'ProfilePhoto' | 'CnicFront' | 'CnicBack' | 'Resume' | 'ReferenceLetter' | 'ExtraDocument';

export interface DocumentDto {
  id: number;
  documentType: DocumentTypeKey;
  fileId: string | null;
  externalLinkUrl: string | null;
  version: number;
  status: 'Pending' | 'Approved' | 'Rejected';
  remarks: string | null;
  uploadedAtUtc: string;
  reviewedByUserId: number | null;
  reviewedAtUtc: string | null;
}

export interface InternDashboardDto {
  internProfileId: number;
  fullName: string;
  email: string;
  phone: string | null;
  cnic: string | null;
  internCode: string;
  departmentName: string;
  mentorName: string;
  internshipStartDate: string;
  internshipEndDate: string;
  dailyStartTime: string;
  dailyEndTime: string;
  universityName: string | null;
  degreeProgram: string | null;
  verificationStatus: 'PendingSubmission' | 'PendingReview' | 'Verified' | 'Rejected';
  profilePhotoStatus: 'Missing' | 'Pending' | 'Approved' | 'Rejected';
  approvedPhotoFileId: string | null;
  address: string | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  bloodGroup: string | null;
  selfDetailsSubmitted: boolean;
  documents: DocumentDto[];
}

export interface SubmitSelfDetailsRequest {
  address: string | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  bloodGroup: string | null;
}

export interface DocumentReviewQueueItemDto {
  documentId: number;
  internProfileId: number;
  internFullName: string;
  internCode: string;
  departmentId: number | null;
  departmentName: string | null;
  documentType: DocumentTypeKey;
  fileId: string | null;
  contentType: string | null;
  externalLinkUrl: string | null;
  version: number;
  uploadedAtUtc: string;
}

export interface PickedDocumentFile {
  uri: string;
  name: string;
  mimeType?: string | null;
}

function buildUploadForm(file: PickedDocumentFile, documentType: DocumentTypeKey): FormData {
  const form = new FormData();
  form.append('File', {
    uri: file.uri,
    name: file.name,
    type: file.mimeType ?? 'application/octet-stream',
  } as unknown as Blob);
  form.append('DocumentType', documentType);
  return form;
}

export const documentsApi = {
  getDashboard: () => client.get<InternDashboardDto>(endpoints.documents.dashboard).then((r) => r.data),

  upload: (file: PickedDocumentFile, documentType: DocumentTypeKey) =>
    client
      .post<DocumentDto>(endpoints.documents.upload, buildUploadForm(file, documentType), {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then((r) => r.data),

  submitExtraLink: (url: string) => client.post<DocumentDto>(endpoints.documents.extraLink, { url }).then((r) => r.data),

  submitSelfDetails: (body: SubmitSelfDetailsRequest) => client.post(endpoints.documents.selfDetails, body),

  review: {
    getQueue: () => client.get<DocumentReviewQueueItemDto[]>(endpoints.documents.review.queue).then((r) => r.data),

    decide: (documentId: number, approve: boolean, remarks?: string) =>
      client.post(endpoints.documents.review.decide(documentId), { approve, remarks: remarks ?? null }),
  },
};
