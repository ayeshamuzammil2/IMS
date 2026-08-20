using PIA.Application.Contracts.Documents;

namespace PIA.Application.Abstractions;

/// <summary>Intern-facing document upload + self-service profile details, scoped to the current
/// authenticated intern via ICurrentUser.</summary>
public interface IDocumentService
{
    Task<InternDashboardDto> GetMyDashboardAsync(CancellationToken ct);

    Task<DocumentDto> UploadAsync(UploadDocumentRequest request, CancellationToken ct);

    Task SubmitSelfDetailsAsync(SubmitSelfDetailsRequest request, CancellationToken ct);
}

/// <summary>Mentor/Admin review queue for pending document submissions - a mentor sees only their
/// own mentees, matching every other mentor-scoped query in this system.</summary>
public interface IDocumentReviewService
{
    Task<IReadOnlyList<DocumentReviewQueueItemDto>> GetPendingAsync(CancellationToken ct);

    Task DecideAsync(int documentId, ReviewDocumentRequest request, CancellationToken ct);
}
