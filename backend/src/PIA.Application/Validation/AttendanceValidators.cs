using FluentValidation;
using PIA.Application.Contracts.Attendance;

namespace PIA.Application.Validation;

public sealed class CreateAttendanceSessionRequestValidator : AbstractValidator<CreateAttendanceSessionRequest>
{
    public CreateAttendanceSessionRequestValidator()
    {
        RuleFor(x => x.EventType).Must(v => v is "Arrival" or "Departure").WithMessage("EventType must be 'Arrival' or 'Departure'.");
        RuleFor(x => x.Latitude).InclusiveBetween(-90m, 90m);
        RuleFor(x => x.Longitude).InclusiveBetween(-180m, 180m);
        RuleFor(x => x.AccuracyMeters).GreaterThan(0);
        RuleFor(x => x.DeviceId).NotEmpty().MaximumLength(128);
    }
}

public sealed class RequestOverrideRequestValidator : AbstractValidator<RequestOverrideRequest>
{
    public RequestOverrideRequestValidator()
    {
        RuleFor(x => x.EventType).Must(v => v is "Arrival" or "Departure").WithMessage("EventType must be 'Arrival' or 'Departure'.");
        RuleFor(x => x.ReasonCode).NotEmpty().MaximumLength(60);
        // Kept in sync with AttendanceOptions.MinOverrideJustificationLength's default - the plan
        // requires a mandatory, meaningfully-detailed justification, not a one-word excuse.
        RuleFor(x => x.Justification).NotEmpty().MinimumLength(20).MaximumLength(1000);
    }
}
