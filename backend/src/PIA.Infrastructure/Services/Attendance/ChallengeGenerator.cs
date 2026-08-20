using PIA.Application.Abstractions;
using PIA.Application.Contracts.Attendance;
using PIA.Domain.Enums;

namespace PIA.Infrastructure.Services.Attendance;

/// <summary>
/// Randomizes action type, order, count, and hold duration per session. Always guarantees at
/// least one TurnLeft/TurnRight so the parallax and specular-temporal detectors have a rotation
/// to work with - without it those detectors would always return Inconclusive.
/// </summary>
public sealed class ChallengeGenerator : IChallengeGenerator
{
    private static readonly ChallengeActionType[] OptionalActions =
    [
        ChallengeActionType.TurnLeft, ChallengeActionType.TurnRight,
        ChallengeActionType.Blink, ChallengeActionType.Smile,
        ChallengeActionType.NodUp, ChallengeActionType.NodDown,
    ];

    public ChallengeSpecDto Generate()
    {
        var rng = Random.Shared;
        var stepCount = rng.Next(3, 5); // 3-4 actions total

        var mandatoryTurn = rng.Next(2) == 0 ? ChallengeActionType.TurnLeft : ChallengeActionType.TurnRight;
        var pool = new List<ChallengeActionType> { mandatoryTurn };

        var remaining = OptionalActions.Where(a => a != mandatoryTurn).OrderBy(_ => rng.Next()).Take(stepCount - 1);
        pool.AddRange(remaining);

        var shuffled = pool.OrderBy(_ => rng.Next()).ToList();
        var steps = shuffled.Select(a => new ChallengeStepDto(a, rng.Next(400, 750))).ToList();

        return new ChallengeSpecDto(steps);
    }
}
