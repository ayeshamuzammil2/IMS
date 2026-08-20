using FluentValidation;
using Microsoft.AspNetCore.Mvc.Filters;
using DomainValidationException = PIA.Domain.Exceptions.ValidationException;

namespace PIA.Api.Filters;

/// <summary>
/// FluentValidation's own ASP.NET Core auto-validation is deprecated in 11.x, so validation is
/// run explicitly here: for each action argument with a registered IValidator&lt;T&gt;, validate
/// and throw ValidationException on failure. Runs before the action executes.
/// </summary>
public sealed class FluentValidationActionFilter(IServiceProvider serviceProvider) : IAsyncActionFilter
{
    public async Task OnActionExecutionAsync(ActionExecutingContext context, ActionExecutionDelegate next)
    {
        foreach (var argument in context.ActionArguments.Values)
        {
            if (argument is null) continue;

            var validatorType = typeof(IValidator<>).MakeGenericType(argument.GetType());
            if (serviceProvider.GetService(validatorType) is not IValidator validator) continue;

            var validationContext = new ValidationContext<object>(argument);
            var result = await validator.ValidateAsync(validationContext, context.HttpContext.RequestAborted);
            if (!result.IsValid)
            {
                var errors = result.Errors
                    .GroupBy(e => e.PropertyName)
                    .ToDictionary(g => g.Key, g => g.Select(e => e.ErrorMessage).ToArray());
                throw new DomainValidationException(errors);
            }
        }

        await next();
    }
}
