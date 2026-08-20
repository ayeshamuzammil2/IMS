using PIA.Domain.Enums;

namespace PIA.Domain.Entities;

public class InternProfile
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public User User { get; set; } = null!;
    public int MentorId { get; set; }
    public User Mentor { get; set; } = null!;

    public required string InternCode { get; set; }
    public DateOnly InternshipStartDate { get; set; }
    public DateOnly InternshipEndDate { get; set; }
    public TimeOnly DailyStartTime { get; set; }
    public TimeOnly DailyEndTime { get; set; }

    public string? UniversityName { get; set; }
    public string? DegreeProgram { get; set; }
    public string? Address { get; set; }
    public string? EmergencyContactName { get; set; }
    public string? EmergencyContactPhone { get; set; }
    public string? BloodGroup { get; set; }

    public VerificationStatus VerificationStatus { get; set; } = VerificationStatus.PendingSubmission;
    public string? VerificationRemarks { get; set; }
    public int? VerifiedByUserId { get; set; }
    public DateTime? VerifiedAtUtc { get; set; }

    public ProfilePhotoStatus ProfilePhotoStatus { get; set; } = ProfilePhotoStatus.Missing;
    public int? ProfilePhotoApprovedByUserId { get; set; }
    public DateTime? ProfilePhotoApprovedAtUtc { get; set; }
    public Guid? ApprovedPhotoFileId { get; set; }

    public FaceEnrollmentStatus FaceEnrollmentStatus { get; set; } = FaceEnrollmentStatus.None;

    public string? GithubRepoUrl { get; set; }
    public GithubStatus GithubStatus { get; set; } = GithubStatus.NotSubmitted;

    public bool SelfDetailsSubmitted { get; set; }
    public DateTime? SelfDetailsSubmittedAtUtc { get; set; }
    public bool ProfileLocked { get; set; }

    public AttendanceAccommodation AttendanceAccommodation { get; set; } = AttendanceAccommodation.None;
    public string? AttendanceAccommodationReason { get; set; }
    public DateOnly? AttendanceAccommodationExpiresOn { get; set; }

    public DateTime CreatedAtUtc { get; set; }
    public DateTime? UpdatedAtUtc { get; set; }

    public ICollection<InternDocument> Documents { get; set; } = new List<InternDocument>();
    public ICollection<AttendanceDay> AttendanceDays { get; set; } = new List<AttendanceDay>();
    public ICollection<ProjectAssignment> ProjectAssignments { get; set; } = new List<ProjectAssignment>();
    public ICollection<GithubSubmission> GithubSubmissions { get; set; } = new List<GithubSubmission>();
    public ICollection<FaceTemplate> FaceTemplates { get; set; } = new List<FaceTemplate>();
    public Certificate? Certificate { get; set; }
    public IdCard? IdCard { get; set; }
}
