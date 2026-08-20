namespace PIA.Application.Contracts.Dashboard;

public sealed record AttendanceTrendPointDto(DateOnly Date, int PresentCount, int LateCount, int AbsentCount);

public sealed record DepartmentCountDto(string DepartmentName, int Count);

public sealed record VerificationCountDto(string Status, int Count);

/// <summary>One shape for both Admin (org-wide) and Mentor (own interns only) dashboards - fields
/// that don't apply to a role's scope (e.g. TotalMentors/TotalDepartments/InternsByDepartment for
/// a Mentor) come back zero/empty rather than the frontend calling two different endpoints.</summary>
public sealed record DashboardSummaryDto(
    int TotalInterns,
    int TotalMentors,
    int TotalDepartments,
    int PresentTodayCount,
    int LateTodayCount,
    int AbsentTodayCount,
    int OnLeaveTodayCount,
    IReadOnlyList<AttendanceTrendPointDto> SevenDayTrend,
    IReadOnlyList<DepartmentCountDto> InternsByDepartment,
    IReadOnlyList<VerificationCountDto> VerificationBreakdown);
