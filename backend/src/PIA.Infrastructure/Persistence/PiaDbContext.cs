using Microsoft.EntityFrameworkCore;
using PIA.Domain.Entities;
using PIA.Infrastructure.Persistence.Conventions;

namespace PIA.Infrastructure.Persistence;

public class PiaDbContext(DbContextOptions<PiaDbContext> options) : DbContext(options)
{
    public DbSet<Department> Departments => Set<Department>();
    public DbSet<DepartmentCodeSequence> DepartmentCodeSequences => Set<DepartmentCodeSequence>();
    public DbSet<User> Users => Set<User>();
    public DbSet<InternProfile> InternProfiles => Set<InternProfile>();
    public DbSet<StoredFile> StoredFiles => Set<StoredFile>();
    public DbSet<InternDocument> InternDocuments => Set<InternDocument>();

    public DbSet<AttendanceDay> AttendanceDays => Set<AttendanceDay>();
    public DbSet<AttendanceEvent> AttendanceEvents => Set<AttendanceEvent>();
    public DbSet<FaceTemplate> FaceTemplates => Set<FaceTemplate>();
    public DbSet<AttendanceChallengeSession> AttendanceChallengeSessions => Set<AttendanceChallengeSession>();
    public DbSet<FaceVerificationResult> FaceVerificationResults => Set<FaceVerificationResult>();
    public DbSet<AttendanceVerificationAttempt> AttendanceVerificationAttempts => Set<AttendanceVerificationAttempt>();
    public DbSet<AttendanceMedia> AttendanceMedia => Set<AttendanceMedia>();
    public DbSet<DeviceBinding> DeviceBindings => Set<DeviceBinding>();
    public DbSet<AttendanceOverride> AttendanceOverrides => Set<AttendanceOverride>();

    public DbSet<ProjectAssignment> ProjectAssignments => Set<ProjectAssignment>();
    public DbSet<GithubSubmission> GithubSubmissions => Set<GithubSubmission>();
    public DbSet<CertificateTemplate> CertificateTemplates => Set<CertificateTemplate>();
    public DbSet<Certificate> Certificates => Set<Certificate>();
    public DbSet<IdCard> IdCards => Set<IdCard>();

    public DbSet<Notification> Notifications => Set<Notification>();
    public DbSet<PushToken> PushTokens => Set<PushToken>();
    public DbSet<ChatMessage> ChatMessages => Set<ChatMessage>();
    public DbSet<AuditLog> AuditLogs => Set<AuditLog>();
    public DbSet<EmailOutboxMessage> EmailOutboxMessages => Set<EmailOutboxMessage>();
    public DbSet<RefreshToken> RefreshTokens => Set<RefreshToken>();
    public DbSet<Holiday> Holidays => Set<Holiday>();
    public DbSet<JobRun> JobRuns => Set<JobRun>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(PiaDbContext).Assembly);

        ApplyStringEnumConversions(modelBuilder);
        ApplyUtcDateTimeConversions(modelBuilder);
    }

    /// <summary>
    /// Persists every enum property as a VARCHAR(40), never MySQL native ENUM and never an int.
    /// Native ENUM needs a schema migration to add a value (this is exactly what caused v1's
    /// schema drift between EF and schema.sql); int makes the database unreadable and silently
    /// corrupts data on enum reordering.
    /// </summary>
    private static void ApplyStringEnumConversions(ModelBuilder modelBuilder)
    {
        foreach (var entityType in modelBuilder.Model.GetEntityTypes())
        {
            foreach (var property in entityType.GetProperties())
            {
                var clrType = property.ClrType;
                var underlying = Nullable.GetUnderlyingType(clrType);
                var enumType = underlying ?? clrType;
                if (!enumType.IsEnum) continue;

                var converterType = underlying is null
                    ? typeof(EnumStringConverter<>).MakeGenericType(enumType)
                    : typeof(NullableEnumStringConverter<>).MakeGenericType(enumType);
                var converter = (Microsoft.EntityFrameworkCore.Storage.ValueConversion.ValueConverter)
                    Activator.CreateInstance(converterType)!;
                property.SetValueConverter(converter);
                property.SetMaxLength(40);
            }
        }
    }

    private static void ApplyUtcDateTimeConversions(ModelBuilder modelBuilder)
    {
        foreach (var entityType in modelBuilder.Model.GetEntityTypes())
        {
            foreach (var property in entityType.GetProperties())
            {
                if (property.ClrType == typeof(DateTime))
                {
                    property.SetValueConverter(new UtcDateTimeConverter());
                }
                else if (property.ClrType == typeof(DateTime?))
                {
                    property.SetValueConverter(new UtcNullableDateTimeConverter());
                }
            }
        }
    }
}
