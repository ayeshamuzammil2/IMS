using PIA.Application.Contracts.Departments;

namespace PIA.Application.Abstractions;

public interface IDepartmentService
{
    Task<IReadOnlyList<DepartmentDto>> ListAsync(CancellationToken ct);
    Task<IReadOnlyList<DepartmentLookupDto>> LookupAsync(CancellationToken ct);
    Task<DepartmentDto> GetAsync(int id, CancellationToken ct);
    Task<DepartmentDto> CreateAsync(CreateDepartmentRequest request, CancellationToken ct);
    Task<DepartmentDto> UpdateAsync(int id, UpdateDepartmentRequest request, CancellationToken ct);
    Task DeactivateAsync(int id, CancellationToken ct);
    Task ReactivateAsync(int id, CancellationToken ct);
}
