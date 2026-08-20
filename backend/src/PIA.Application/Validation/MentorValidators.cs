using FluentValidation;
using PIA.Application.Contracts.Mentors;

namespace PIA.Application.Validation;

public sealed class CreateMentorRequestValidator : AbstractValidator<CreateMentorRequest>
{
    public CreateMentorRequestValidator()
    {
        RuleFor(x => x.FullName).NotEmpty().MaximumLength(150);
        RuleFor(x => x.Email).NotEmpty().MustBeValidEmail();
        RuleFor(x => x.Cnic).NotEmpty().MustBeValidCnic();
        RuleFor(x => x.Phone).MustBeValidOptionalPhone();
        RuleFor(x => x.DepartmentId).GreaterThan(0);
    }
}

public sealed class UpdateMentorRequestValidator : AbstractValidator<UpdateMentorRequest>
{
    public UpdateMentorRequestValidator()
    {
        RuleFor(x => x.FullName).NotEmpty().MaximumLength(150);
        RuleFor(x => x.Phone).MustBeValidOptionalPhone();
    }
}

public sealed class TransferMentorRequestValidator : AbstractValidator<TransferMentorRequest>
{
    public TransferMentorRequestValidator()
    {
        RuleFor(x => x.NewDepartmentId).GreaterThan(0);
    }
}
