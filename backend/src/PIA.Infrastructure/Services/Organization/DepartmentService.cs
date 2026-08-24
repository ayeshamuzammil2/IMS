using Microsoft.EntityFrameworkCore;
using PIA.Application.Abstractions;
using PIA.Application.Contracts.Departments;
using PIA.Domain.Entities;
using PIA.Domain.Enums;
using PIA.Domain.Exceptions;
using PIA.Infrastructure.Persistence;

namespace PIA.Infrastructure.Services.Organization;

public sealed class DepartmentService(PiaDbContext db, IClock clock) : IDepartmentService
{
    /// <summary>Strict upper bound on attendance geofence radius. Admins may still tighten it below
    /// this for a smaller facility footprint - this caps looseness, not precision.</summary>
    private const int MaxGeofenceRadiusMeters = 100;

    public async Task<IReadOnlyList<DepartmentDto>> ListAsync(CancellationToken ct)
    {
        return await db.Departments.AsNoTracking()
            .OrderBy(d => d.Name)
            .Select(d => new DepartmentDto(
                d.Id, d.Name, d.Code, d.Description, d.Latitude, d.Longitude, d.GeofenceRadiusMeters, d.IsActive,
                d.Users.Count(u => u.Role == UserRole.Mentor && u.IsActive),
                d.Users.Count(u => u.Role == UserRole.Intern && u.IsActive)))
            .ToListAsync(ct);
    }

    public async Task<IReadOnlyList<DepartmentLookupDto>> LookupAsync(CancellationToken ct)
    {
        return await db.Departments.AsNoTracking()
            .Where(d => d.IsActive)
            .OrderBy(d => d.Name)
            .Select(d => new DepartmentLookupDto(d.Id, d.Name))
            .ToListAsync(ct);
    }

    public async Task<DepartmentDto> GetAsync(int id, CancellationToken ct)
    {
        var dto = await db.Departments.AsNoTracking()
            .Where(d => d.Id == id)
            .Select(d => new DepartmentDto(
                d.Id, d.Name, d.Code, d.Description, d.Latitude, d.Longitude, d.GeofenceRadiusMeters, d.IsActive,
                d.Users.Count(u => u.Role == UserRole.Mentor && u.IsActive),
                d.Users.Count(u => u.Role == UserRole.Intern && u.IsActive)))
            .FirstOrDefaultAsync(ct);

        return dto ?? throw new NotFoundException(nameof(Department), id);
    }

    public async Task<DepartmentDto> CreateAsync(CreateDepartmentRequest request, CancellationToken ct)
    {
        EnsureRadiusWithinLimit(request.GeofenceRadiusMeters);
        await EnsureUniqueAsync(request.Name, request.Code, null, ct);

        var department = new Department
        {
            Name = request.Name,
            Code = request.Code,
            Description = request.Description,
            Latitude = request.Latitude,
            Longitude = request.Longitude,
            GeofenceRadiusMeters = request.GeofenceRadiusMeters,
            IsActive = true,
            CreatedAtUtc = clock.UtcNow,
        };
        db.Departments.Add(department);
        await db.SaveChangesAsync(ct);

        return new DepartmentDto(department.Id, department.Name, department.Code, department.Description,
            department.Latitude, department.Longitude, department.GeofenceRadiusMeters, department.IsActive, 0, 0);
    }

    public async Task<DepartmentDto> UpdateAsync(int id, UpdateDepartmentRequest request, CancellationToken ct)
    {
        EnsureRadiusWithinLimit(request.GeofenceRadiusMeters);

        var department = await db.Departments.FirstOrDefaultAsync(d => d.Id == id, ct)
            ?? throw new NotFoundException(nameof(Department), id);

        await EnsureUniqueAsync(request.Name, request.Code, id, ct);

        department.Name = request.Name;
        department.Code = request.Code;
        department.Description = request.Description;
        department.Latitude = request.Latitude;
        department.Longitude = request.Longitude;
        department.GeofenceRadiusMeters = request.GeofenceRadiusMeters;
        await db.SaveChangesAsync(ct);

        return await GetAsync(id, ct);
    }

    /// <summary>Hard delete. Users.DepartmentId is configured OnDelete(SetNull), so this cannot
    /// leave a dangling FK even for historical/inactive users still pointing at this department -
    /// only the "active" restriction the spec calls for is enforced here.</summary>
    public async Task DeleteAsync(int id, CancellationToken ct)
    {
        var department = await db.Departments.FirstOrDefaultAsync(d => d.Id == id, ct)
            ?? throw new NotFoundException(nameof(Department), id);

        var hasActiveUsers = await db.Users.AnyAsync(u => u.DepartmentId == id && u.IsActive, ct);
        if (hasActiveUsers)
        {
            throw new ConflictException("This department still has active mentors or interns. Reassign or deactivate them first.");
        }

        db.Departments.Remove(department);
        await db.SaveChangesAsync(ct);
    }

    public async Task DeactivateAsync(int id, CancellationToken ct)
    {
        var department = await db.Departments.FirstOrDefaultAsync(d => d.Id == id, ct)
            ?? throw new NotFoundException(nameof(Department), id);

        var hasActiveUsers = await db.Users.AnyAsync(u => u.DepartmentId == id && u.IsActive, ct);
        if (hasActiveUsers)
        {
            throw new ConflictException("This department still has active mentors or interns. Reassign or deactivate them first.");
        }

        department.IsActive = false;
        await db.SaveChangesAsync(ct);
    }

    public async Task ReactivateAsync(int id, CancellationToken ct)
    {
        var department = await db.Departments.FirstOrDefaultAsync(d => d.Id == id, ct)
            ?? throw new NotFoundException(nameof(Department), id);

        department.IsActive = true;
        await db.SaveChangesAsync(ct);
    }

    private static void EnsureRadiusWithinLimit(int geofenceRadiusMeters)
    {
        if (geofenceRadiusMeters > MaxGeofenceRadiusMeters)
        {
            throw new ValidationException("geofenceRadiusMeters", $"Geofence radius cannot exceed {MaxGeofenceRadiusMeters} meters.");
        }
    }

    private async Task EnsureUniqueAsync(string name, string code, int? excludingId, CancellationToken ct)
    {
        var nameTaken = await db.Departments.AnyAsync(d => d.Name == name && d.Id != (excludingId ?? -1), ct);
        if (nameTaken)
        {
            throw new ConflictException($"A department named '{name}' already exists.");
        }

        var codeTaken = await db.Departments.AnyAsync(d => d.Code == code && d.Id != (excludingId ?? -1), ct);
        if (codeTaken)
        {
            throw new ConflictException($"Department code '{code}' is already in use.");
        }
    }
}
