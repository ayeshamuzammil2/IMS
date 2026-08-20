namespace PIA.Application.Abstractions;

public interface IInternCodeGenerator
{
    /// <summary>Generates PIA-{DEPT}-{yyyy}-{NNNN}, race-free under concurrent creation in the same department/year.</summary>
    Task<string> GenerateAsync(int departmentId, string departmentCode, CancellationToken ct);
}
