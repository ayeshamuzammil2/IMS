using PIA.Application.Contracts.Attendance;

namespace PIA.Application.Abstractions;

/// <summary>Randomizes action type, order, count, and hold duration per session - a pre-built clip
/// library becomes impractical, though randomization alone is not treated as a primary defense
/// (see the geometry detectors for that).</summary>
public interface IChallengeGenerator
{
    ChallengeSpecDto Generate();
}
