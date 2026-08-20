using Microsoft.EntityFrameworkCore.Storage.ValueConversion;

namespace PIA.Infrastructure.Persistence.Conventions;

/// <summary>
/// MySQL/Pomelo has no concept of DateTimeKind - every value round-trips as Unspecified.
/// This converter forces Utc on read, so a round-tripped value can never be silently
/// misinterpreted as Local (the exact class of bug that broke v1's Late/date-boundary logic).
/// Application code is expected to only ever persist UTC instants through properties ending
/// in "...Utc" - see PkTime/IClock for the PKT-local read side.
/// </summary>
public sealed class UtcDateTimeConverter() : ValueConverter<DateTime, DateTime>(
    v => DateTime.SpecifyKind(v, DateTimeKind.Utc),
    v => DateTime.SpecifyKind(v, DateTimeKind.Utc));

public sealed class UtcNullableDateTimeConverter() : ValueConverter<DateTime?, DateTime?>(
    v => v.HasValue ? DateTime.SpecifyKind(v.Value, DateTimeKind.Utc) : v,
    v => v.HasValue ? DateTime.SpecifyKind(v.Value, DateTimeKind.Utc) : v);
