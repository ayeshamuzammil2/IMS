import { client } from '../client';
import { endpoints } from '../endpoints';

export interface ProjectAssignmentDto {
  id: number;
  internProfileId: number;
  internFullName: string | null;
  internCode: string | null;
  title: string;
  description: string | null;
  fileId: string | null;
  dueDate: string | null;
  status: 'Assigned' | 'Submitted' | 'Completed';
  assignedAtUtc: string;
}

export interface AssignProjectInput {
  title: string;
  description: string | null;
  dueDate: string | null;
  file: { uri: string; name: string; mimeType: string | null } | null;
}

function buildAssignForm(input: AssignProjectInput): FormData {
  const form = new FormData();
  form.append('Title', input.title);
  if (input.description) form.append('Description', input.description);
  if (input.dueDate) form.append('DueDate', input.dueDate);
  if (input.file) {
    form.append('File', { uri: input.file.uri, name: input.file.name, type: input.file.mimeType ?? 'application/octet-stream' } as unknown as Blob);
  }
  return form;
}

export const projectsApi = {
  getMine: () => client.get<ProjectAssignmentDto[]>(endpoints.projects.mine).then((r) => r.data),

  getForIntern: (internProfileId: number) =>
    client.get<ProjectAssignmentDto[]>(endpoints.projects.forIntern(internProfileId)).then((r) => r.data),

  assign: (internProfileId: number, input: AssignProjectInput) =>
    client
      .post<ProjectAssignmentDto>(endpoints.projects.assign(internProfileId), buildAssignForm(input), {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then((r) => r.data),

  update: (assignmentId: number, input: AssignProjectInput) =>
    client
      .put<ProjectAssignmentDto>(endpoints.projects.update(assignmentId), buildAssignForm(input), {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then((r) => r.data),

  delete: (assignmentId: number) => client.delete(endpoints.projects.delete(assignmentId)),
};