using PIA.Application.Contracts.Mentors;

namespace PIA.Application.Abstractions;

public interface IMentorService
{
    Task<IReadOnlyList<MentorDto>> ListAsync(string? search, int? departmentId, bool? isActive, CancellationToken ct);
    Task<MentorDto> GetAsync(int id, CancellationToken ct);
    Task<MentorDto> CreateAsync(CreateMentorRequest request, CancellationToken ct);
    Task<MentorDto> UpdateAsync(int id, UpdateMentorRequest request, CancellationToken ct);
    Task DeleteAsync(int id, CancellationToken ct);
    Task DeactivateAsync(int id, CancellationToken ct);
    Task ReactivateAsync(int id, CancellationToken ct);
    Task ResetPasswordAsync(int id, ResetMentorPasswordRequest request, CancellationToken ct);
    Task TransferAsync(int id, TransferMentorRequest request, CancellationToken ct);
}
