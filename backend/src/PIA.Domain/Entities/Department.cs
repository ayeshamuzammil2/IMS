namespace PIA.Domain.Entities;

public class Department
{
    public int Id { get; set; }
    public required string Name { get; set; }
    public required string Code { get; set; }
    public string? Description { get; set; }
    public decimal Latitude { get; set; }
    public decimal Longitude { get; set; }
    public int GeofenceRadiusMeters { get; set; } = 150;
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAtUtc { get; set; }
    public DateTime? UpdatedAtUtc { get; set; }

    public ICollection<User> Users { get; set; } = new List<User>();
    public ICollection<DepartmentCodeSequence> CodeSequences { get; set; } = new List<DepartmentCodeSequence>();
}

public class DepartmentCodeSequence
{
    public int DepartmentId { get; set; }
    public Department Department { get; set; } = null!;
    public int Year { get; set; }
    public int NextValue { get; set; } = 1;
}
