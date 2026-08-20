namespace PIA.Domain.Exceptions;

public abstract class AppException : Exception
{
    public abstract string ErrorCode { get; }
    public abstract int StatusCode { get; }

    protected AppException(string message) : base(message) { }
    protected AppException(string message, Exception innerException) : base(message, innerException) { }
}

public sealed class NotFoundException : AppException
{
    public override string ErrorCode => "NOT_FOUND";
    public override int StatusCode => 404;

    public NotFoundException(string entity, object key)
        : base($"{entity} '{key}' was not found.") { }
}

public sealed class ForbiddenException : AppException
{
    public override string ErrorCode => "FORBIDDEN";
    public override int StatusCode => 403;

    public ForbiddenException(string message = "You are not allowed to perform this action.") : base(message) { }
}

public sealed class ConflictException : AppException
{
    public override string ErrorCode => "CONFLICT";
    public override int StatusCode => 409;

    public ConflictException(string message) : base(message) { }
}

public class ValidationException : AppException
{
    public override string ErrorCode => "VALIDATION_FAILED";
    public override int StatusCode => 400;

    public IReadOnlyDictionary<string, string[]> Errors { get; }

    public ValidationException(IReadOnlyDictionary<string, string[]> errors)
        : base("One or more validation errors occurred.")
    {
        Errors = errors;
    }

    public ValidationException(string field, string message)
        : base(message)
    {
        Errors = new Dictionary<string, string[]> { [field] = [message] };
    }
}

public sealed class InvalidCnicException : ValidationException
{
    public InvalidCnicException(string message) : base("cnic", message) { }
}

public sealed class InvalidPhoneException : ValidationException
{
    public InvalidPhoneException(string message) : base("phone", message) { }
}

public sealed class InvalidEmailException : ValidationException
{
    public InvalidEmailException(string message) : base("email", message) { }
}

public sealed class BusinessRuleException : AppException
{
    public override string ErrorCode { get; }
    public override int StatusCode => 422;

    public BusinessRuleException(string code, string message) : base(message)
    {
        ErrorCode = code;
    }
}
