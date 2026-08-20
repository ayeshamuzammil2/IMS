using FluentValidation;
using PIA.Application.Contracts.Interns;

namespace PIA.Application.Validation;

public sealed class CreateInternRequestValidator : AbstractValidator<CreateInternRequest>
{
    public CreateInternRequestValidator()
    {
        RuleFor(x => x.FullName).NotEmpty().MaximumLength(150);
        RuleFor(x => x.Email).NotEmpty().MustBeValidEmail();
        RuleFor(x => x.Cnic).NotEmpty().MustBeValidCnic();
        RuleFor(x => x.Phone).MustBeValidOptionalPhone();
        RuleFor(x => x.MentorId).GreaterThan(0).When(x => x.MentorId is not null);
        RuleFor(x => x.InternshipEndDate).GreaterThan(x => x.InternshipStartDate);
        RuleFor(x => x.DailyEndTime).GreaterThan(x => x.DailyStartTime);
        RuleFor(x => x.UniversityName).MaximumLength(200);
        RuleFor(x => x.DegreeProgram).MaximumLength(200);
    }
}

public sealed class UpdateInternRequestValidator : AbstractValidator<UpdateInternRequest>
{
    public UpdateInternRequestValidator()
    {
        RuleFor(x => x.FullName).NotEmpty().MaximumLength(150);
        RuleFor(x => x.Phone).MustBeValidOptionalPhone();
        RuleFor(x => x.MentorId).GreaterThan(0).When(x => x.MentorId is not null);
        RuleFor(x => x.InternshipEndDate).GreaterThan(x => x.InternshipStartDate);
        RuleFor(x => x.DailyEndTime).GreaterThan(x => x.DailyStartTime);
        RuleFor(x => x.UniversityName).MaximumLength(200);
        RuleFor(x => x.DegreeProgram).MaximumLength(200);
    }
}
