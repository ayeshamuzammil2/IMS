using System.Text;
using System.Threading.RateLimiting;
using FluentValidation;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using PIA.Api.Auth;
using PIA.Api.ErrorHandling;
using PIA.Api.Filters;
using PIA.Api.Middleware;
using PIA.Api.Options;
using PIA.Application.Abstractions;
using PIA.Application.Options;
using PIA.Application.Validation;
using PIA.Infrastructure;
using PIA.Infrastructure.Services.Auth;
using Serilog;

var builder = WebApplication.CreateBuilder(args);

builder.Host.UseSerilog((context, services, configuration) => configuration
    .ReadFrom.Configuration(context.Configuration)
    .Enrich.FromLogContext());

// ---------- Core services ----------
builder.Services.AddHttpContextAccessor();
builder.Services.AddScoped<ICurrentUser, HttpCurrentUser>();
builder.Services.AddScoped<ICorrelationContext, HttpCorrelationContext>();

builder.Services.AddControllers(options =>
{
    options.Filters.Add<FluentValidationActionFilter>();
})
.AddJsonOptions(options =>
{
    // Without this, any raw enum-typed DTO property (e.g. ChallengeStepDto.Action) serializes as
    // a fragile numeric ordinal instead of a name - every other "enum as string" spot in the API
    // achieves it only via manual ToString() calls, which is easy to forget on a new DTO.
    options.JsonSerializerOptions.Converters.Add(new System.Text.Json.Serialization.JsonStringEnumConverter());
});
builder.Services.AddValidatorsFromAssemblyContaining<LoginRequestValidator>();

builder.Services.AddExceptionHandler<GlobalExceptionHandler>();
builder.Services.AddProblemDetails();

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc("v1", new() { Title = "PIA Internee Attendance API", Version = "v1" });
    options.AddSecurityDefinition("Bearer", new()
    {
        Name = "Authorization",
        Type = Microsoft.OpenApi.Models.SecuritySchemeType.ApiKey,
        Scheme = "Bearer",
        BearerFormat = "JWT",
        In = Microsoft.OpenApi.Models.ParameterLocation.Header,
        Description = "Enter: Bearer {your JWT token}",
    });
    options.AddSecurityRequirement(new()
    {
        {
            new() { Reference = new() { Type = Microsoft.OpenApi.Models.ReferenceType.SecurityScheme, Id = "Bearer" } },
            []
        },
    });
});

// ---------- Infrastructure (DbContext, auth services, etc.) ----------
builder.Services.AddInfrastructure(builder.Configuration);

// Fails startup if Jwt:Key is missing, too short, or a known placeholder.
builder.Services.AddSingleton<IValidateOptions<JwtOptions>, JwtOptionsValidator>();

// ---------- Health checks ----------
builder.Services.AddHealthChecks()
    .AddMySql(builder.Configuration.GetConnectionString("DefaultConnection") ?? string.Empty, name: "mysql");

// ---------- CORS ----------
// Never AllowAnyOrigin - a native RN client doesn't use CORS at all (only the Expo web build
// would), so the allow-list can and must stay tight. Empty in Production is a startup failure,
// not a silent wildcard.
var allowedOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>() ?? [];
if (allowedOrigins.Length == 0 && builder.Environment.IsProduction())
{
    throw new InvalidOperationException("Cors:AllowedOrigins must not be empty in Production.");
}
builder.Services.AddCors(options =>
{
    options.AddPolicy("Default", policy =>
    {
        if (allowedOrigins.Length > 0)
        {
            policy.WithOrigins(allowedOrigins).AllowAnyMethod().AllowAnyHeader();
        }
    });
});

// ---------- Rate limiting ----------
builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;

    options.AddPolicy("auth-login", context =>
        RateLimitPartition.GetFixedWindowLimiter(
            PartitionKey(context),
            _ => new FixedWindowRateLimiterOptions { PermitLimit = 5, Window = TimeSpan.FromMinutes(5) }));

    options.AddPolicy("auth-forgot", context =>
        RateLimitPartition.GetFixedWindowLimiter(
            PartitionKey(context),
            _ => new FixedWindowRateLimiterOptions { PermitLimit = 3, Window = TimeSpan.FromMinutes(15) }));

    options.GlobalLimiter = PartitionedRateLimiter.Create<HttpContext, string>(context =>
        RateLimitPartition.GetFixedWindowLimiter(
            context.Connection.RemoteIpAddress?.ToString() ?? "unknown",
            _ => new FixedWindowRateLimiterOptions { PermitLimit = 300, Window = TimeSpan.FromMinutes(1) }));

    static string PartitionKey(HttpContext context) =>
        $"{context.Connection.RemoteIpAddress}";
});

// ---------- Auth ----------
var jwtSection = builder.Configuration.GetSection(JwtOptions.SectionName);
builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    // Without this, the handler silently remaps short claim types ("sub", our custom "sst",
    // "dept", "intern_id") to legacy long XML claim URIs on validation, so every FindFirst(...)
    // for those exact names in HttpCurrentUser/OnTokenValidated would return null.
    options.MapInboundClaims = false;

    var key = jwtSection["Key"] ?? string.Empty;
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true,
        ValidIssuer = jwtSection["Issuer"],
        ValidAudience = jwtSection["Audience"],
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(key)),
        ClockSkew = TimeSpan.FromSeconds(30),
    };

    options.Events = new JwtBearerEvents
    {
        OnTokenValidated = async context =>
        {
            var userIdClaim = context.Principal?.FindFirst(System.IdentityModel.Tokens.Jwt.JwtRegisteredClaimNames.Sub)?.Value;
            var stampClaim = context.Principal?.FindFirst(JwtClaimTypes.SecurityStamp)?.Value;

            if (!int.TryParse(userIdClaim, out var userId) || string.IsNullOrEmpty(stampClaim))
            {
                context.Fail("Malformed token.");
                return;
            }

            var securityService = context.HttpContext.RequestServices.GetRequiredService<IUserSecurityService>();
            var state = await securityService.GetStateAsync(userId, context.HttpContext.RequestAborted);

            if (!state.Found || !state.IsActive || state.SecurityStamp != stampClaim)
            {
                context.Fail("This session is no longer valid. Please sign in again.");
            }
        },
    };
});

builder.Services.AddAuthorization(options => options.AddPiaPolicies());

var app = builder.Build();

// ---------- Migrate (Development only) + seed (idempotent; safe every startup) ----------
// Delegated entirely to PIA.Infrastructure - PiaDbContext is not visible from PIA.Api.
await DatabaseBootstrapper.MigrateAndSeedAsync(app.Services, app.Configuration, applyMigrations: app.Environment.IsDevelopment());

// ---------- Middleware pipeline ----------
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseMiddleware<SecurityHeadersMiddleware>();
app.UseMiddleware<RequestCorrelationMiddleware>();

app.UseExceptionHandler();

app.UseCors("Default");
app.UseRateLimiter();

app.UseAuthentication();
app.UseMiddleware<MustResetPasswordGateMiddleware>();
app.UseAuthorization();

app.MapControllers();
// FallbackPolicy is deny-by-default for every endpoint, including minimal-API ones like this -
// health checks need to be reachable by infra/monitoring without a JWT.
app.MapHealthChecks("/health").AllowAnonymous();

app.Run();

public partial class Program;
