namespace PIA.Application.Contracts.Mentors;

public sealed record CreateMentorRequest(string FullName, string Email, string Cnic, string? Phone, int DepartmentId, string Password);

public sealed record UpdateMentorRequest(string FullName, string? Phone, string? Cnic);

public sealed record TransferMentorRequest(int NewDepartmentId);

public sealed record ResetMentorPasswordRequest(string NewPassword);

public sealed record MentorDto(
    int Id, string FullName, string Email, string? Phone, string? Cnic,
    int DepartmentId, string DepartmentName, bool IsActive, int InternCount);
