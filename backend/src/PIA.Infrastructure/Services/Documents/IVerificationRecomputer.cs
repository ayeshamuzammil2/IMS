namespace PIA.Infrastructure.Services.Documents;

/// <summary>Infrastructure-internal - shared between DocumentService (after upload) and
/// DocumentReviewService (after a review decision) so the verification state machine has exactly
/// one implementation regardless of which side triggered the recompute.</summary>
public interface IVerificationRecomputer
{
    Task RecomputeAsync(int internProfileId, CancellationToken ct);
}
