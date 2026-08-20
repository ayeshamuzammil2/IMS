import { client } from '../client';
import { endpoints } from '../endpoints';

export interface MentorDto {
  id: number;
  fullName: string;
  email: string;
  phone: string | null;
  cnic: string | null;
  departmentId: number;
  departmentName: string;
  isActive: boolean;
  internCount: number;
}

export interface CreateMentorRequest {
  fullName: string;
  email: string;
  cnic: string;
  phone: string | null;
  departmentId: number;
}

export interface UpdateMentorRequest {
  fullName: string;
  phone: string | null;
}

export interface MentorListParams {
  search?: string;
  departmentId?: number;
  isActive?: boolean;
}

export const mentorsApi = {
  list: (params?: MentorListParams) => client.get<MentorDto[]>(endpoints.mentors.list, { params }).then((r) => r.data),

  get: (id: number) => client.get<MentorDto>(endpoints.mentors.byId(id)).then((r) => r.data),

  create: (body: CreateMentorRequest) => client.post<MentorDto>(endpoints.mentors.list, body).then((r) => r.data),

  update: (id: number, body: UpdateMentorRequest) => client.put<MentorDto>(endpoints.mentors.byId(id), body).then((r) => r.data),

  deactivate: (id: number) => client.delete(endpoints.mentors.deactivate(id)),

  reactivate: (id: number) => client.post(endpoints.mentors.reactivate(id)),

  resetPassword: (id: number) => client.post(endpoints.mentors.resetPassword(id)),

  transfer: (id: number, newDepartmentId: number) =>
    client.post(endpoints.mentors.transfer(id), { newDepartmentId }),
};
