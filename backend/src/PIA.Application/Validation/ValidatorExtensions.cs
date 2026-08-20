using FluentValidation;
using PIA.Domain.ValueObjects;

namespace PIA.Application.Validation;

/// <summary>Bridges the Domain value objects' TryParse validation into FluentValidation, so the
/// exact same CNIC/phone/email rules apply everywhere and error messages come from one place.</summary>
public static class ValidatorExtensions
{
    public static IRuleBuilderOptionsConditions<T, string> MustBeValidCnic<T>(this IRuleBuilder<T, string> rule) =>
        rule.Custom((value, context) =>
        {
            if (!Cnic.TryParse(value, out _, out var error))
            {
                context.AddFailure(error!);
            }
        });

    public static IRuleBuilderOptionsConditions<T, string?> MustBeValidOptionalPhone<T>(this IRuleBuilder<T, string?> rule) =>
        rule.Custom((value, context) =>
        {
            if (string.IsNullOrWhiteSpace(value)) return;
            if (!PakistanPhone.TryParse(value, out _, out var error))
            {
                context.AddFailure(error!);
            }
        });

    public static IRuleBuilderOptionsConditions<T, string> MustBeValidEmail<T>(this IRuleBuilder<T, string> rule) =>
        rule.Custom((value, context) =>
        {
            if (!PIA.Domain.ValueObjects.EmailAddress.TryParse(value, out _, out var error))
            {
                context.AddFailure(error!);
            }
        });
}
