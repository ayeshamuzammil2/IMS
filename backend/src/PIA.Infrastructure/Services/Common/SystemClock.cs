using PIA.Application.Abstractions;
using TimeZoneConverter;

namespace PIA.Infrastructure.Services.Common;

/// <summary>
/// Resolves Asia/Karachi via TimeZoneConverter so the same IANA id ("Asia/Karachi") works
/// identically on Windows ("Pakistan Standard Time") and Linux, rather than depending on
/// .NET's ICU/IANA mapping being present on the host. PKT is UTC+5 with no DST since 2009.
/// </summary>
public sealed class SystemClock : IClock
{
    private static readonly TimeZoneInfo PakistanTimeZone = TZConvert.GetTimeZoneInfo("Asia/Karachi");

    public DateTime UtcNow => DateTime.UtcNow;

    public DateTimeOffset NowInPakistan => ToPakistan(DateTime.UtcNow);

    public DateOnly TodayInPakistan => DateOnly.FromDateTime(NowInPakistan.DateTime);

    public DateTimeOffset ToPakistan(DateTime utc)
    {
        var utcKind = DateTime.SpecifyKind(utc, DateTimeKind.Utc);
        var local = TimeZoneInfo.ConvertTimeFromUtc(utcKind, PakistanTimeZone);
        return new DateTimeOffset(local, PakistanTimeZone.GetUtcOffset(utcKind));
    }

    public DateTime ToUtc(DateOnly localDate, TimeOnly localTime)
    {
        var local = localDate.ToDateTime(localTime);
        return TimeZoneInfo.ConvertTimeToUtc(DateTime.SpecifyKind(local, DateTimeKind.Unspecified), PakistanTimeZone);
    }
}
