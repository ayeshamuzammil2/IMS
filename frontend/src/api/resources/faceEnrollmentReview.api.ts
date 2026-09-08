import { client } from '../client';
import { endpoints } from '../endpoints';

export interface FaceEnrollmentReviewQueueItemDto {
  internProfileId: number;
  internFullName: string;
  internCode: string;
  departmentName: string | null;
  templateId: number;
  version: number;
  createdAtUtc: string;
}

export interface FaceEnrollmentReviewDetailDto {
  internProfileId: number;
  internFullName: string;
  internCode: string;
  departmentName: string | null;
  templateId: number;
  version: number;
  /** The mentor-approved static profile photo - what the system originally cross-matched against. */
  approvedPhotoFileId: string | null;
  /** The best frame captured live during enrollment - what a human should actually look at. */
  capturedImageFileId: string | null;
  qualityScore: number | null;
  crossMatchScore: number | null;
  intraSetMinScore: number | null;
  enrollmentReason: string;
  createdAtUtc: string;
}

export const faceEnrollmentReviewApi = {
  getQueue: () => client.get<FaceEnrollmentReviewQueueItemDto[]>(endpoints.attendance.enrollment.review.queue).then((r) => r.data),

  getDetail: (internProfileId: number) =>
    client.get<FaceEnrollmentReviewDetailDto>(endpoints.attendance.enrollment.review.detail(internProfileId)).then((r) => r.data),

  decide: (internProfileId: number, approve: boolean, reason?: string) =>
    client.post(endpoints.attendance.enrollment.review.decide(internProfileId), { approve, reason: reason ?? null }),
};
