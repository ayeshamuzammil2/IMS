import { client } from '../client';
import { endpoints } from '../endpoints';

export interface DepartmentDto {
  id: number;
  name: string;
  code: string;
  description: string | null;
  latitude: number;
  longitude: number;
  geofenceRadiusMeters: number;
  isActive: boolean;
  mentorCount: number;
  internCount: number;
}

export interface DepartmentLookupDto {
  id: number;
  name: string;
}

export interface CreateDepartmentRequest {
  name: string;
  code: string;
  description: string | null;
  latitude: number;
  longitude: number;
  geofenceRadiusMeters: number;
}

export type UpdateDepartmentRequest = CreateDepartmentRequest;

export const departmentsApi = {
  list: () => client.get<DepartmentDto[]>(endpoints.departments.list).then((r) => r.data),

  lookup: () => client.get<DepartmentLookupDto[]>(endpoints.departments.lookup).then((r) => r.data),

  get: (id: number) => client.get<DepartmentDto>(endpoints.departments.byId(id)).then((r) => r.data),

  create: (body: CreateDepartmentRequest) => client.post<DepartmentDto>(endpoints.departments.list, body).then((r) => r.data),

  update: (id: number, body: UpdateDepartmentRequest) =>
    client.put<DepartmentDto>(endpoints.departments.byId(id), body).then((r) => r.data),

  delete: (id: number) => client.delete(endpoints.departments.byId(id)),

  deactivate: (id: number) => client.post(endpoints.departments.deactivate(id)),

  reactivate: (id: number) => client.post(endpoints.departments.reactivate(id)),
};
