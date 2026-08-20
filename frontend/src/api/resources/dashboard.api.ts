import { client } from '../client';
import { endpoints } from '../endpoints';

export interface AttendanceTrendPointDto {
  date: string;
  presentCount: number;
  lateCount: number;
  absentCount: number;
}

export interface DepartmentCountDto {
  departmentName: string;
  count: number;
}

export interface VerificationCountDto {
  status: string;
  count: number;
}

export interface DashboardSummaryDto {
  totalInterns: number;
  totalMentors: number;
  totalDepartments: number;
  presentTodayCount: number;
  lateTodayCount: number;
  absentTodayCount: number;
  onLeaveTodayCount: number;
  sevenDayTrend: AttendanceTrendPointDto[];
  internsByDepartment: DepartmentCountDto[];
  verificationBreakdown: VerificationCountDto[];
}

export const dashboardApi = {
  getSummary: (departmentId?: number) =>
    client.get<DashboardSummaryDto>(endpoints.dashboard.summary, { params: { departmentId } }).then((r) => r.data),
};
