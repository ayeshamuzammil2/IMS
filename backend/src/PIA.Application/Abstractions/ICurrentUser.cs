using PIA.Domain.Enums;

namespace PIA.Application.Abstractions;

public interface ICurrentUser
{
    bool IsAuthenticated { get; }
    int UserId { get; }
    UserRole Role { get; }
    string Email { get; }
    int? DepartmentId { get; }
    int? InternProfileId { get; }
    string Scope { get; }
    string SecurityStamp { get; }
    string Jti { get; }
}
