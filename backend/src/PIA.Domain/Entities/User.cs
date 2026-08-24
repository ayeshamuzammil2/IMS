using PIA.Domain.Enums;

namespace PIA.Domain.Entities;

public class User
{
    public int Id { get; set; }
    public UserRole Role { get; set; }
    public required string FullName { get; set; }
    public required string Email { get; set; }
    public string? Phone { get; set; }
    public string? Cnic { get; set; }
    public required string PasswordHash { get; set; }
    public bool MustResetPassword { get; set; }
    public DateTime? PasswordChangedAtUtc { get; set; }
    public string SecurityStamp { get; set; } = Guid.NewGuid().ToString("N");

    public int? DepartmentId { get; set; }
    public Department? Department { get; set; }

    public bool IsActive { get; set; } = true;
    public DateTime? DeactivatedAtUtc { get; set; }

    public int FailedLoginCount { get; set; }
    public DateTime? LockoutEndUtc { get; set; }
    public DateTime? LastLoginAtUtc { get; set; }

    /// <summary>Distinct from the password-attempt lockout above: set by AttendanceService when an
    /// intern hits the 5-strike face-verification limit or exceeds the daily attempt cap. Blocks
    /// login entirely (see AuthService.LoginAsync) until a mentor/admin unlocks the account.</summary>
    public bool IsLockedForUnofficialActivity { get; set; }
    public string? UnofficialActivityReason { get; set; }

    public DateTime CreatedAtUtc { get; set; }
    public DateTime? UpdatedAtUtc { get; set; }

    public InternProfile? InternProfile { get; set; }
    public ICollection<InternProfile> MenteeProfiles { get; set; } = new List<InternProfile>();
    public ICollection<RefreshToken> RefreshTokens { get; set; } = new List<RefreshToken>();
    public ICollection<Notification> Notifications { get; set; } = new List<Notification>();
}
