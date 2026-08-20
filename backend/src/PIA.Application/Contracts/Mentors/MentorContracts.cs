namespace PIA.Application.Contracts.Mentors;

public sealed record CreateMentorRequest(string FullName, string Email, string Cnic, string? Phone, int DepartmentId);

public sealed record UpdateMentorRequest(string FullName, string? Phone);

public sealed record TransferMentorRequest(int NewDepartmentId);

public sealed record MentorDto(
    int Id, string FullName, string Email, string? Phone, string? Cnic,
    int DepartmentId, string DepartmentName, bool IsActive, int InternCount);
