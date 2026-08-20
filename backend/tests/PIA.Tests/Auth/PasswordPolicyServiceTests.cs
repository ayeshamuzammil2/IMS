using FluentAssertions;
using Microsoft.Extensions.Options;
using NSubstitute;
using PIA.Application.Abstractions;
using PIA.Application.Options;
using PIA.Domain.Exceptions;
using PIA.Infrastructure.Services.Auth;
using Xunit;

namespace PIA.Tests.Auth;

public sealed class PasswordPolicyServiceTests
{
    private readonly IPasswordHasher _hasher = Substitute.For<IPasswordHasher>();
    private readonly PasswordPolicyService _service;

    public PasswordPolicyServiceTests()
    {
        var options = Options.Create(new PasswordPolicyOptions());
        _service = new PasswordPolicyService(options, _hasher);
    }

    [Fact]
    public void Validate_MeetsAllRules_DoesNotThrow()
    {
        var act = () => _service.Validate("Correct!Horse9", "someone@pia.local", "Someone Else");
        act.Should().NotThrow();
    }

    [Fact]
    public void Validate_TooShort_Throws()
    {
        var act = () => _service.Validate("Sh0rt!a");
        act.Should().Throw<ValidationException>().WithMessage("*at least 10 characters*");
    }

    [Fact]
    public void Validate_MissingUppercase_Throws()
    {
        var act = () => _service.Validate("lowercase1!");
        act.Should().Throw<ValidationException>().WithMessage("*uppercase*");
    }

    [Fact]
    public void Validate_MissingDigit_Throws()
    {
        var act = () => _service.Validate("NoDigitsHere!");
        act.Should().Throw<ValidationException>().WithMessage("*digit*");
    }

    [Fact]
    public void Validate_MissingSymbol_Throws()
    {
        var act = () => _service.Validate("NoSymbolHere1");
        act.Should().Throw<ValidationException>().WithMessage("*special character*");
    }

    [Fact]
    public void Validate_CommonPassword_Throws()
    {
        var act = () => _service.Validate("Passw0rd");
        act.Should().Throw<ValidationException>().WithMessage("*too common*");
    }

    [Fact]
    public void Validate_ContainsEmailLocalPart_Throws()
    {
        var act = () => _service.Validate("JohnDoe123!", "johndoe@pia.local");
        act.Should().Throw<ValidationException>().WithMessage("*email address*");
    }

    [Fact]
    public void Validate_ContainsFirstName_Throws()
    {
        var act = () => _service.Validate("Mohammad123!", fullName: "Mohammad Khan");
        act.Should().Throw<ValidationException>().WithMessage("*name*");
    }

    [Fact]
    public void Validate_ShortFirstName_IsNotChecked()
    {
        // First names under 3 characters (e.g. "Al") are deliberately excluded to avoid rejecting
        // otherwise-strong passwords over a coincidental two-letter substring match.
        var act = () => _service.Validate("Al2345678!", fullName: "Al Rahman");
        act.Should().NotThrow();
    }

    [Fact]
    public void Validate_SameAsCurrentPassword_Throws()
    {
        _hasher.Verify("Correct!Horse9", "existing-hash").Returns(true);

        var act = () => _service.Validate("Correct!Horse9", currentPasswordHash: "existing-hash");
        act.Should().Throw<ValidationException>().WithMessage("*different from the current password*");
    }

    [Fact]
    public void Validate_DifferentFromCurrentPassword_DoesNotThrow()
    {
        _hasher.Verify("Correct!Horse9", "existing-hash").Returns(false);

        var act = () => _service.Validate("Correct!Horse9", currentPasswordHash: "existing-hash");
        act.Should().NotThrow();
    }
}
