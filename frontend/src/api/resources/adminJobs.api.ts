import { client } from '../client';
import { endpoints } from '../endpoints';

export const adminJobsApi = {
  runAutoAbsent: (date?: string) =>
    client.post<{ job: string; processed: number; date: string }>(endpoints.adminJobs.run('auto-absent'), null, { params: { date } }).then((r) => r.data),

  runMediaRetention: () =>
    client.post<{ job: string; processed: number }>(endpoints.adminJobs.run('media-retention')).then((r) => r.data),
};
