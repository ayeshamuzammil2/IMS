using FluentValidation;
using PIA.Application.Abstractions;
using PIA.Application.Contracts.Auth;
using DomainValidationException = PIA.Domain.Exceptions.ValidationException;

namespace PIA.Application.Validation;

public sealed class LoginRequestValidator : AbstractValidator<LoginRequest>
{
    public LoginRequestValidator()
    {
        RuleFor(x => x.Email).NotEmpty().EmailAddress();
        RuleFor(x => x.Password).NotEmpty();
    }
}

public sealed class ChangePasswordRequestValidator : AbstractValidator<ChangePasswordRequest>
{
    public ChangePasswordRequestValidator(IPasswordPolicyService passwordPolicy)
    {
        RuleFor(x => x.CurrentPassword).NotEmpty();
        RuleFor(x => x.NewPassword).NotEmpty()
            .Must(pwd => SatisfiesPolicy(pwd, passwordPolicy, out _))
            .WithMessage((_, pwd) =>
            {
                SatisfiesPolicy(pwd, passwordPolicy, out var message);
                return message ?? "Password does not meet the required policy.";
            });
        RuleFor(x => x)
            .Must(x => x.NewPassword != x.CurrentPassword)
            .WithName("newPassword")
            .WithMessage("New password must be different from the current password.");
    }

    private static bool SatisfiesPolicy(string password, IPasswordPolicyService policy, out string? message)
    {
        try
        {
            policy.Validate(password);
            message = null;
            return true;
        }
        catch (DomainValidationException ex)
        {
            message = string.Join(" ", ex.Errors.Values.SelectMany(v => v));
            return false;
        }
    }
}

public sealed class ForgotPasswordRequestValidator : AbstractValidator<ForgotPasswordRequest>
{
    public ForgotPasswordRequestValidator()
    {
        RuleFor(x => x.Email).NotEmpty().EmailAddress();
    }
}
