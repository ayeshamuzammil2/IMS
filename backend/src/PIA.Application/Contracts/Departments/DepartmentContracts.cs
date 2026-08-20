namespace PIA.Application.Contracts.Departments;

public sealed record CreateDepartmentRequest(string Name, string Code, string? Description, decimal Latitude, decimal Longitude, int GeofenceRadiusMeters);

public sealed record UpdateDepartmentRequest(string Name, string Code, string? Description, decimal Latitude, decimal Longitude, int GeofenceRadiusMeters);

public sealed record DepartmentDto(
    int Id, string Name, string Code, string? Description,
    decimal Latitude, decimal Longitude, int GeofenceRadiusMeters,
    bool IsActive, int MentorCount, int InternCount);

public sealed record DepartmentLookupDto(int Id, string Name);
