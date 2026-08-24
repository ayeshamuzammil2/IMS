import { client } from '../client';
import { endpoints } from '../endpoints';

export type IdCardStatusKey = 'Draft' | 'PendingApproval' | 'Approved' | 'Issued' | 'Rejected';

export interface IdCardDto {
  internProfileId: number;
  internFullName: string | null;
  internCode: string | null;
  departmentName: string | null;
  cardNumber: string | null;
  status: IdCardStatusKey;
  generatedFileId: string | null;
  validUntil: string | null;
  rejectionReason: string | null;
  designation: string | null;
  email: string | null;
  emergencyContactPhone: string | null;
  photoFileId: string | null;
}

export const idCardsApi = {
  getMine: () => client.get<IdCardDto>(endpoints.idcards.mine).then((r) => r.data),

  list: (departmentId?: number) => client.get<IdCardDto[]>(endpoints.idcards.list, { params: { departmentId } }).then((r) => r.data),

  getForIntern: (internProfileId: number) => client.get<IdCardDto>(endpoints.idcards.forIntern(internProfileId)).then((r) => r.data),

  submit: (internProfileId: number, designation: string) =>
    client.post<IdCardDto>(endpoints.idcards.submit(internProfileId), { designation }).then((r) => r.data),

  approve: (internProfileId: number) => client.post<IdCardDto>(endpoints.idcards.approve(internProfileId)).then((r) => r.data),

  issue: (internProfileId: number) => client.post<IdCardDto>(endpoints.idcards.issue(internProfileId)).then((r) => r.data),
};
