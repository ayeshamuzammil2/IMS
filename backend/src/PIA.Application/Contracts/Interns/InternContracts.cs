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
    string? DegreeProgram);

/// <summary>MentorId is honored only when the caller is an Admin; a Mentor cannot reassign a mentee to someone else.</summary>
public sealed record UpdateInternRequest(
    string FullName,
    string? Phone,
    DateOnly InternshipStartDate,
    DateOnly InternshipEndDate,
    TimeOnly DailyStartTime,
    TimeOnly DailyEndTime,
    string? UniversityName,
    string? DegreeProgram,
    int? MentorId);

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
    bool IsActive);
