using Microsoft.EntityFrameworkCore.Storage.ValueConversion;

namespace PIA.Infrastructure.Persistence.Conventions;

public sealed class EnumStringConverter<TEnum>() : ValueConverter<TEnum, string>(
    v => v.ToString()!,
    v => (TEnum)Enum.Parse(typeof(TEnum), v))
    where TEnum : struct, Enum;

public sealed class NullableEnumStringConverter<TEnum>() : ValueConverter<TEnum?, string?>(
    v => v.HasValue ? v.Value.ToString() : null,
    v => v == null ? null : (TEnum?)Enum.Parse(typeof(TEnum), v))
    where TEnum : struct, Enum;
