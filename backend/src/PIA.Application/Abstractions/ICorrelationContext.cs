namespace PIA.Application.Abstractions;

public interface ICorrelationContext
{
    string CorrelationId { get; }
    string? IpAddress { get; }
    string? UserAgent { get; }
}
