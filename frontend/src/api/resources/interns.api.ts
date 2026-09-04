import { client } from '../client';
import { endpoints } from '../endpoints';

export interface InternDto {
  id: number;
  userId: number;
  fullName: string;
  email: string;
  phone: string | null;
  cnic: string | null;
  internCode: string;
  departmentId: number;
  departmentName: string;
  mentorId: number;
  mentorName: string;
  internshipStartDate: string; // yyyy-MM-dd
  internshipEndDate: string; // yyyy-MM-dd
  dailyStartTime: string; // HH:mm:ss
  dailyEndTime: string; // HH:mm:ss
  universityName: string | null;
  degreeProgram: string | null;
  verificationStatus: string;
  isActive: boolean;
  address: string | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  bloodGroup: string | null;
  attendanceReady: boolean;
  isLockedForUnofficialActivity: boolean;
  faceEnrollmentStatus: string;
  /** True only while an admin has granted one pending re-enrollment (see unlockFaceEnrollment).
   * Automatically flips back to false the moment the intern successfully re-enrolls. */
  faceReEnrollmentAllowed: boolean;
}

/** mentorId is required only when an Admin creates the intern - a Mentor creating their own intern omits it. */
export interface CreateInternRequest {
  fullName: string;
  email: string;
  cnic: string;
  phone: string | null;
  mentorId: number | null;
  internshipStartDate: string;
  internshipEndDate: string;
  dailyStartTime: string;
  dailyEndTime: string;
  universityName: string | null;
  degreeProgram: string | null;
  password: string;
}

export interface UpdateInternRequest {
  fullName: string;
  phone: string | null;
  internshipStartDate: string;
  internshipEndDate: string;
  dailyStartTime: string;
  dailyEndTime: string;
  universityName: string | null;
  degreeProgram: string | null;
  mentorId: number | null;
  address: string | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  bloodGroup: string | null;
}

export interface InternListParams {
  search?: string;
  departmentId?: number;
  mentorId?: number;
  verificationStatus?: string;
  isActive?: boolean;
}

export const internsApi = {
  list: (params?: InternListParams) => client.get<InternDto[]>(endpoints.interns.list, { params }).then((r) => r.data),

  get: (id: number) => client.get<InternDto>(endpoints.interns.byId(id)).then((r) => r.data),

  create: (body: CreateInternRequest) => client.post<InternDto>(endpoints.interns.list, body).then((r) => r.data),

  update: (id: number, body: UpdateInternRequest) => client.put<InternDto>(endpoints.interns.byId(id), body).then((r) => r.data),

  delete: (id: number) => client.delete(endpoints.interns.byId(id)),

  deactivate: (id: number) => client.post(endpoints.interns.deactivate(id)),

  reactivate: (id: number) => client.post(endpoints.interns.reactivate(id)),

  resetPassword: (id: number, newPassword: string) => client.post(endpoints.interns.resetPassword(id), { newPassword }),

  unlockAttendance: (id: number) => client.post(endpoints.interns.unlock(id)),

  /** Grants exactly one more face enrollment past the standard one-time lock - consumed
   * automatically the next time the intern successfully enrolls. */
  unlockFaceEnrollment: (id: number, reason: string) =>
    client.post(endpoints.interns.unlockFaceEnrollment(id), { reason }),
};
