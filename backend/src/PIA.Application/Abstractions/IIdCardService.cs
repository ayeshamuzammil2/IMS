using PIA.Application.Contracts.IdCards;

namespace PIA.Application.Abstractions;

/// <summary>Per-intern ID card lifecycle: Submit (Mentor/Admin, renders the PDF with the real
/// approved photo immediately) -> Approve (Admin) -> Issue (Admin).</summary>
public interface IIdCardService
{
    Task<IdCardDto> GetMineAsync(CancellationToken ct);

    /// <summary>Mentor/Admin-facing - lets the UI decide whether to show Submit, Approve, or Issue for this intern.</summary>
    Task<IdCardDto> GetForInternAsync(int internProfileId, CancellationToken ct);

    /// <summary>Mentor/Admin oversight listing - only interns that already have a generated ID card row.</summary>
    Task<IReadOnlyList<IdCardDto>> ListAsync(int? departmentId, CancellationToken ct);

    Task<IdCardDto> SubmitAsync(int internProfileId, SubmitIdCardRequest request, CancellationToken ct);

    Task<IdCardDto> ApproveAsync(int internProfileId, CancellationToken ct);

    Task<IdCardDto> IssueAsync(int internProfileId, CancellationToken ct);

    /// <summary>Mentor/Admin-facing - deletes the ID card row (and its generated file) for an
    /// intern, letting them start over. A Mentor may not delete a card that has already been
    /// Issued - only Admin can at that point.</summary>
    Task DeleteAsync(int internProfileId, CancellationToken ct);
}
