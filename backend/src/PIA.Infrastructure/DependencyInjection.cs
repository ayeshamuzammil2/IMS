using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using PIA.Application.Abstractions;
using PIA.Application.Options;
using PIA.Infrastructure.Persistence;
using PIA.Infrastructure.Persistence.Interceptors;
using PIA.Infrastructure.Services.Attendance;
using PIA.Infrastructure.Services.Attendance.VideoReplay;
using PIA.Infrastructure.Services.Auth;
using PIA.Infrastructure.Services.Certificates;
using PIA.Infrastructure.Services.Chat;
using PIA.Infrastructure.Services.Common;
using PIA.Infrastructure.Services.Dashboard;
using PIA.Infrastructure.Services.DeviceIntegrity;
using PIA.Infrastructure.Services.Documents;
using PIA.Infrastructure.Services.Email;
using PIA.Infrastructure.Services.Files;
using PIA.Infrastructure.Services.Github;
using PIA.Infrastructure.Services.IdCards;
using PIA.Infrastructure.Services.Notifications;
using PIA.Infrastructure.Services.Organization;
using PIA.Infrastructure.Services.Projects;

namespace PIA.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(this IServiceCollection services, IConfiguration configuration)
    {
        services.AddMemoryCache();

        services.AddScoped<TimestampSaveChangesInterceptor>();
        services.AddScoped<AuditSaveChangesInterceptor>();

        var connectionString = configuration.GetConnectionString("DefaultConnection");
        services.AddDbContext<PiaDbContext>((sp, options) =>
        {
            options.UseMySql(connectionString, ServerVersion.AutoDetect(connectionString), mySqlOptions =>
            {
                mySqlOptions.EnableRetryOnFailure(3);
            })
            .UseSnakeCaseNamingConvention()
            .AddInterceptors(
                sp.GetRequiredService<TimestampSaveChangesInterceptor>(),
                sp.GetRequiredService<AuditSaveChangesInterceptor>());
        });

        services.AddOptions<JwtOptions>()
            .Bind(configuration.GetSection(JwtOptions.SectionName))
            .ValidateDataAnnotations()
            .ValidateOnStart();

        services.AddOptions<PasswordPolicyOptions>()
            .Bind(configuration.GetSection(PasswordPolicyOptions.SectionName));

        services.AddOptions<LoginLockoutOptions>()
            .Bind(configuration.GetSection(LoginLockoutOptions.SectionName));

        services.AddOptions<FileStorageOptions>()
            .Bind(configuration.GetSection(FileStorageOptions.SectionName));

        services.AddOptions<EmailOptions>()
            .Bind(configuration.GetSection(EmailOptions.SectionName));

        services.AddOptions<AttendanceOptions>()
            .Bind(configuration.GetSection(AttendanceOptions.SectionName));

        services.AddOptions<FaceOptions>()
            .Bind(configuration.GetSection(FaceOptions.SectionName));

        services.AddOptions<PlayIntegrityOptions>()
            .Bind(configuration.GetSection(PlayIntegrityOptions.SectionName));

        services.AddOptions<CertificateOptions>()
            .Bind(configuration.GetSection(CertificateOptions.SectionName));

        services.AddSingleton<IClock, SystemClock>();
        services.AddScoped<IAuditLogger, AuditLogger>();

        services.AddScoped<IPasswordHasher, BCryptPasswordHasher>();
        services.AddScoped<IJwtTokenService, JwtTokenService>();
        services.AddScoped<IRefreshTokenService, RefreshTokenService>();
        services.AddScoped<IUserSecurityService, UserSecurityService>();
        services.AddScoped<IPasswordPolicyService, PasswordPolicyService>();
        services.AddScoped<ILoginLockoutService, LoginLockoutService>();
        services.AddScoped<ITempPasswordGenerator, TempPasswordGenerator>();
        services.AddScoped<IEmailQueue, OutboxEmailQueue>();
        services.AddScoped<IEmailSender, SmtpEmailSender>();
        services.AddScoped<IEmailTemplateRenderer, ScribanEmailTemplateRenderer>();
        services.AddHostedService<EmailOutboxProcessor>();
        services.AddScoped<IAuthService, AuthService>();

        services.AddScoped<IFileStorage, LocalFileStorage>();
        services.AddScoped<IFileAccessAuthorizer, FileAccessAuthorizer>();

        services.AddScoped<INotificationService, NotificationService>();
        services.AddScoped<INotificationQueryService, NotificationQueryService>();
        services.AddScoped<IPushTokenService, PushTokenService>();
        services.AddHttpClient<IPushNotificationSender, ExpoPushClient>();

        services.AddScoped<IDepartmentService, DepartmentService>();
        services.AddScoped<IMentorService, MentorService>();
        services.AddScoped<IInternCodeGenerator, InternCodeGenerator>();
        services.AddScoped<IInternService, InternService>();

        services.AddScoped<IAttendanceService, AttendanceService>();
        services.AddScoped<IAttendanceQueryService, AttendanceQueryService>();
        services.AddScoped<IAutoAbsentJob, AutoAbsentJob>();
        services.AddHostedService<AutoAbsentBackgroundService>();
        services.AddScoped<IMediaRetentionJob, MediaRetentionJob>();
        services.AddHostedService<MediaRetentionBackgroundService>();

        services.AddScoped<IChallengeGenerator, ChallengeGenerator>();
        services.AddSingleton<IFaceVerificationProvider, OnnxFaceVerificationProvider>();
        services.AddSingleton<IFaceDetector, OnnxFaceDetector>();
        services.AddScoped<IParallaxResidualDetector, ParallaxResidualDetector>();
        services.AddScoped<ISpecularTemporalAnalyzer, SpecularTemporalAnalyzer>();
        services.AddScoped<IRollingShutterBandingDetector, RollingShutterBandingDetector>();
        services.AddScoped<IMoireDetector, MoireDetector>();
        services.AddScoped<ICompressionForensicsDetector, CompressionForensicsDetector>();
        services.AddScoped<IFaceEnrollmentService, FaceEnrollmentService>();
        services.AddScoped<IAttendanceReviewService, AttendanceReviewService>();

        services.AddScoped<IVerificationRecomputer, VerificationRecomputer>();
        services.AddScoped<IDocumentService, DocumentService>();
        services.AddScoped<IDocumentReviewService, DocumentReviewService>();

        services.AddScoped<IGithubService, GithubService>();
        services.AddScoped<IGithubReviewService, GithubReviewService>();
        services.AddScoped<IProjectAssignmentService, ProjectAssignmentService>();

        services.AddScoped<IDocxToPdfConverter, LibreOfficeDocxToPdfConverter>();
        services.AddSingleton<IQuestPdfCertificateRenderer, QuestPdfCertificateRenderer>();
        services.AddScoped<ICertificateDocxRenderer, CertificateDocxRenderer>();
        services.AddScoped<ICertificateTemplateService, CertificateTemplateService>();
        services.AddScoped<ICertificateService, CertificateService>();

        services.AddSingleton<IIdCardPdfRenderer, IdCardPdfRenderer>();
        services.AddScoped<IIdCardService, IdCardService>();

        services.AddScoped<IDashboardService, DashboardService>();

        services.AddScoped<IChatService, ChatService>();

        services.AddSingleton<IPlayIntegrityVerifier, GooglePlayIntegrityVerifier>();

        return services;
    }
}