namespace PIA.Application.Contracts.Interns;

/// <summary>
/// MentorId is required when an Admin creates the intern; a Mentor creating their own intern has
/// it ignored server-side and forced to themselves - see InternService.CreateAsync.
/// </summary>
public sealed record CreateInternRequest(
    string FullName,
    string Email,
    string Cnic,
    string? Phone,
    int? MentorId,
    DateOnly InternshipStartDate,
    DateOnly InternshipEndDate,
    TimeOnly DailyStartTime,
    TimeOnly DailyEndTime,
    string? UniversityName,
    string? DegreeProgram,
    string Password);

/// <summary>MentorId is honored only when the caller is an Admin; a Mentor cannot reassign a mentee to someone else.
/// Address/EmergencyContactName/EmergencyContactPhone/BloodGroup are otherwise intern-self-edit-only fields
/// (see DocumentService.SubmitSelfDetailsAsync) - exposed here too so Admin/Mentor can also correct them.</summary>
public sealed record UpdateInternRequest(
    string FullName,
    string? Phone,
    DateOnly InternshipStartDate,
    DateOnly InternshipEndDate,
    TimeOnly DailyStartTime,
    TimeOnly DailyEndTime,
    string? UniversityName,
    string? DegreeProgram,
    int? MentorId,
    string? Address,
    string? EmergencyContactName,
    string? EmergencyContactPhone,
    string? BloodGroup);

public sealed record ResetInternPasswordRequest(string NewPassword);

public sealed record InternDto(
    int Id,
    int UserId,
    string FullName,
    string Email,
    string? Phone,
    string? Cnic,
    string InternCode,
    int DepartmentId,
    string DepartmentName,
    int MentorId,
    string MentorName,
    DateOnly InternshipStartDate,
    DateOnly InternshipEndDate,
    TimeOnly DailyStartTime,
    TimeOnly DailyEndTime,
    string? UniversityName,
    string? DegreeProgram,
    string VerificationStatus,
    bool IsActive,
    string? Address,
    string? EmergencyContactName,
    string? EmergencyContactPhone,
    string? BloodGroup,
    bool AttendanceReady,
    bool IsLockedForUnofficialActivity);
