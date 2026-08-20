namespace PIA.Application.Abstractions;

public interface IClock
{
    DateTime UtcNow { get; }
    DateTimeOffset NowInPakistan { get; }
    DateOnly TodayInPakistan { get; }
    DateTimeOffset ToPakistan(DateTime utc);
    DateTime ToUtc(DateOnly localDate, TimeOnly localTime);
}
