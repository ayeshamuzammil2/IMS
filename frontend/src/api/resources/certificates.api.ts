import { client, apiBaseUrl } from '../client';
import { endpoints } from '../endpoints';

export type CertificateStatusKey = 'Locked' | 'PendingApproval' | 'Approved' | 'Issued' | 'Rejected';

export interface CertificateTemplateDto {
  id: number;
  name: string;
  departmentId: number | null;
  mergeFields: string[];
  isActive: boolean;
  createdAtUtc: string;
}

export interface CertificateDto {
  internProfileId: number;
  internFullName: string | null;
  internCode: string | null;
  departmentName: string | null;
  certificateNumber: string | null;
  status: CertificateStatusKey;
  generatedFileId: string | null;
  issueDate: string | null;
  rejectionReason: string | null;
  /** Attendance percentage across the intern's recorded working days so far. Null if no
   * attendance has been recorded yet. Computed by the backend, not stored. */
  attendancePercentage: number | null;
  /** Short remark auto-derived from attendancePercentage, meant to display next to the
   * certificate (e.g. "Excellent attendance throughout the internship."). */
  attendanceRemark: string | null;
}

export const certificatesApi = {
  getMine: () => client.get<CertificateDto>(endpoints.certificates.mine).then((r) => r.data),

  list: (departmentId?: number) => client.get<CertificateDto[]>(endpoints.certificates.list, { params: { departmentId } }).then((r) => r.data),

  getForIntern: (internProfileId: number) =>
    client.get<CertificateDto>(endpoints.certificates.forIntern(internProfileId)).then((r) => r.data),

  generate: (internProfileId: number, templateId: number) =>
    client.post<CertificateDto>(endpoints.certificates.generate(internProfileId), { templateId }).then((r) => r.data),

  approve: (internProfileId: number) => client.post<CertificateDto>(endpoints.certificates.approve(internProfileId)).then((r) => r.data),

  issue: (internProfileId: number) => client.post<CertificateDto>(endpoints.certificates.issue(internProfileId)).then((r) => r.data),

  // NAYE METHODS YAHAN HAIN
  uploadForIntern: (internProfileId: number, file: { uri: string; name: string; mimeType: string | null }) => {
    const form = new FormData();
    form.append('File', { uri: file.uri, name: file.name, type: file.mimeType ?? 'application/octet-stream' } as unknown as Blob);
    // Note: URL route apne backend ke hisaab se adjust kar lena
    return client
      .post<CertificateDto>(`/certificates/intern/${internProfileId}/upload`, form, { headers: { 'Content-Type': 'multipart/form-data' } })
      .then((r) => r.data);
  },

  delete: (internProfileId: number) =>
    client.delete(`/certificates/intern/${internProfileId}`).then((r) => r.data),

  templates: {
    list: () => client.get<CertificateTemplateDto[]>(endpoints.certificates.templates.list).then((r) => r.data),

    upload: (name: string, departmentId: number | null, file: { uri: string; name: string; mimeType: string | null }) => {
      const form = new FormData();
      form.append('Name', name);
      if (departmentId !== null) form.append('DepartmentId', String(departmentId));
      form.append('File', { uri: file.uri, name: file.name, type: file.mimeType ?? 'application/octet-stream' } as unknown as Blob);
      return client
        .post<CertificateTemplateDto>(endpoints.certificates.templates.upload, form, { headers: { 'Content-Type': 'multipart/form-data' } })
        .then((r) => r.data);
    },

    previewUrl: (templateId: number) => `${apiBaseUrl}/api${endpoints.certificates.templates.preview(templateId)}`,
  },
};