import { client } from '../client';
import { endpoints } from '../endpoints';

export type GithubStatusKey = 'NotSubmitted' | 'Pending' | 'Approved' | 'Rejected' | 'ResubmitRequested';

export interface GithubStatusDto {
  repositoryUrl: string | null;
  status: GithubStatusKey;
  version: number;
  rejectionReason: string | null;
  submittedAtUtc: string | null;
}

export interface GithubReviewQueueItemDto {
  submissionId: number;
  internProfileId: number;
  internFullName: string;
  internCode: string;
  repositoryUrl: string;
  version: number;
  submittedAtUtc: string;
}

export const githubApi = {
  getStatus: () => client.get<GithubStatusDto>(endpoints.github.status).then((r) => r.data),

  submit: (repositoryUrl: string) => client.post<GithubStatusDto>(endpoints.github.submit, { repositoryUrl }).then((r) => r.data),

  review: {
    getQueue: () => client.get<GithubReviewQueueItemDto[]>(endpoints.github.review.queue).then((r) => r.data),

    decide: (submissionId: number, decision: 'Approved' | 'Rejected' | 'ResubmitRequested', reason?: string) =>
      client.post(endpoints.github.review.decide(submissionId), { decision, reason: reason ?? null }),
  },
};
