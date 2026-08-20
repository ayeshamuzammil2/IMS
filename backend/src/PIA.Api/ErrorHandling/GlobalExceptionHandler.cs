using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Mvc;
using PIA.Domain.Exceptions;

namespace PIA.Api.ErrorHandling;

public sealed class GlobalExceptionHandler(ILogger<GlobalExceptionHandler> logger) : IExceptionHandler
{
    public async ValueTask<bool> TryHandleAsync(HttpContext httpContext, Exception exception, CancellationToken ct)
    {
        var (statusCode, code, title, errors) = Classify(exception);

        if (statusCode >= 500)
        {
            logger.LogError(exception, "Unhandled exception. TraceId={TraceId}", httpContext.TraceIdentifier);
        }
        else
        {
            logger.LogInformation(exception, "Request failed with {Code}. TraceId={TraceId}", code, httpContext.TraceIdentifier);
        }

        var problemDetails = new ProblemDetails
        {
            Status = statusCode,
            Title = title,
            Type = $"https://httpstatuses.com/{statusCode}",
        };
        problemDetails.Extensions["code"] = code;
        problemDetails.Extensions["traceId"] = httpContext.TraceIdentifier;
        if (errors is not null)
        {
            problemDetails.Extensions["errors"] = errors;
        }

        httpContext.Response.StatusCode = statusCode;
        await httpContext.Response.WriteAsJsonAsync(problemDetails, ct);
        return true;
    }

    private static (int StatusCode, string Code, string Title, IReadOnlyDictionary<string, string[]>? Errors) Classify(Exception exception)
    {
        return exception switch
        {
            ValidationException ex => (ex.StatusCode, ex.ErrorCode, "Validation failed.", ex.Errors),
            AppException ex => (ex.StatusCode, ex.ErrorCode, ex.Message, null),
            _ => (500, "INTERNAL_ERROR", "An unexpected error occurred.", null),
        };
    }
}
