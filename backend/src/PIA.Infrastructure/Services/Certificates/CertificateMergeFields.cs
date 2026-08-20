using PIA.Domain.Entities;

namespace PIA.Infrastructure.Services.Certificates;

/// <summary>The fixed set of merge fields a certificate template may reference. Shared by upload
/// validation (rejects unknown fields), preview (sample data), and real generation (actual data) -
/// one source of truth so the three can never drift apart.</summary>
public static class CertificateMergeFields
{
    public const string InternName = "InternName";
    public const string InternCode = "InternCode";
    public const string DepartmentName = "DepartmentName";
    public const string MentorName = "MentorName";
    public const string StartDate = "StartDate";
    public const string EndDate = "EndDate";
    public const string IssueDate = "IssueDate";
    public const string CertificateNumber = "CertificateNumber";
    public const string UniversityName = "UniversityName";
    public const string DegreeProgram = "DegreeProgram";

    public static readonly IReadOnlySet<string> KnownFields = new HashSet<string>(
        [InternName, InternCode, DepartmentName, MentorName, StartDate, EndDate, IssueDate, CertificateNumber, UniversityName, DegreeProgram],
        StringComparer.OrdinalIgnoreCase);

    public static Dictionary<string, string> BuildSampleData() => new(StringComparer.OrdinalIgnoreCase)
    {
        [InternName] = "John Doe",
        [InternCode] = "PIA-ERP-2026-0001",
        [DepartmentName] = "ERP Department",
        [MentorName] = "Jane Smith",
        [StartDate] = "01 Jan 2026",
        [EndDate] = "01 Apr 2026",
        [IssueDate] = DateTime.UtcNow.ToString("dd MMM yyyy"),
        [CertificateNumber] = "CERT-PIA-ERP-2026-0001",
        [UniversityName] = "Sample University",
        [DegreeProgram] = "BS Computer Science",
    };

    public static Dictionary<string, string> BuildRealData(InternProfile profile, string certificateNumber, DateOnly issueDate) =>
        new(StringComparer.OrdinalIgnoreCase)
        {
            [InternName] = profile.User.FullName,
            [InternCode] = profile.InternCode,
            [DepartmentName] = profile.User.Department?.Name ?? string.Empty,
            [MentorName] = profile.Mentor.FullName,
            [StartDate] = profile.InternshipStartDate.ToString("dd MMM yyyy"),
            [EndDate] = profile.InternshipEndDate.ToString("dd MMM yyyy"),
            [IssueDate] = issueDate.ToString("dd MMM yyyy"),
            [CertificateNumber] = certificateNumber,
            [UniversityName] = profile.UniversityName ?? string.Empty,
            [DegreeProgram] = profile.DegreeProgram ?? string.Empty,
        };
}
