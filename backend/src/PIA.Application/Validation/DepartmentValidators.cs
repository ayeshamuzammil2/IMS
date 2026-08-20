using FluentValidation;
using PIA.Application.Contracts.Departments;

namespace PIA.Application.Validation;

public sealed class CreateDepartmentRequestValidator : AbstractValidator<CreateDepartmentRequest>
{
    public CreateDepartmentRequestValidator()
    {
        RuleFor(x => x.Name).NotEmpty().MaximumLength(150);
        RuleFor(x => x.Code).NotEmpty().MaximumLength(10).Matches("^[A-Z0-9]+$")
            .WithMessage("Code must be uppercase letters and digits only, e.g. ERP, HR, SCM.");
        RuleFor(x => x.Description).MaximumLength(2000);
        RuleFor(x => x.Latitude).InclusiveBetween(-90, 90);
        RuleFor(x => x.Longitude).InclusiveBetween(-180, 180);
        RuleFor(x => x.GeofenceRadiusMeters).InclusiveBetween(20, 2000)
            .WithMessage("Geofence radius must be between 20 and 2000 meters.");
    }
}

public sealed class UpdateDepartmentRequestValidator : AbstractValidator<UpdateDepartmentRequest>
{
    public UpdateDepartmentRequestValidator()
    {
        RuleFor(x => x.Name).NotEmpty().MaximumLength(150);
        RuleFor(x => x.Code).NotEmpty().MaximumLength(10).Matches("^[A-Z0-9]+$");
        RuleFor(x => x.Description).MaximumLength(2000);
        RuleFor(x => x.Latitude).InclusiveBetween(-90, 90);
        RuleFor(x => x.Longitude).InclusiveBetween(-180, 180);
        RuleFor(x => x.GeofenceRadiusMeters).InclusiveBetween(20, 2000);
    }
}
