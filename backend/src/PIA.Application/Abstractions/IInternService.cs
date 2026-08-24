using PIA.Application.Contracts.Interns;

namespace PIA.Application.Abstractions;

public interface IInternService
{
    Task<IReadOnlyList<InternDto>> ListAsync(string? search, int? departmentId, int? mentorId, string? verificationStatus, bool? isActive, CancellationToken ct);
    Task<InternDto> GetAsync(int internProfileId, CancellationToken ct);
    Task<InternDto> CreateAsync(CreateInternRequest request, CancellationToken ct);
    Task<InternDto> UpdateAsync(int internProfileId, UpdateInternRequest request, CancellationToken ct);
    Task DeleteAsync(int internProfileId, CancellationToken ct);
    Task DeactivateAsync(int internProfileId, CancellationToken ct);
    Task ReactivateAsync(int internProfileId, CancellationToken ct);
    Task ResetPasswordAsync(int internProfileId, ResetInternPasswordRequest request, CancellationToken ct);

    /// <summary>Reverses AttendanceService's unofficial-activity lockout (5-strike or daily-limit
    /// trigger): clears the login block and resets the face-failure counter to zero.</summary>
    Task UnlockAttendanceAsync(int internProfileId, CancellationToken ct);
}
