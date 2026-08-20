using PIA.Application.Contracts.Auth;

namespace PIA.Application.Abstractions;

public interface IAuthService
{
    Task<LoginResponse> LoginAsync(LoginRequest request, string? ip, CancellationToken ct);
    Task<LoginResponse> ChangePasswordAsync(int userId, ChangePasswordRequest request, string? ip, CancellationToken ct);
    Task ForgotPasswordAsync(ForgotPasswordRequest request, CancellationToken ct);
    Task<MeResponse> GetMeAsync(int userId, CancellationToken ct);
    Task<LoginResponse> RefreshAsync(RefreshRequest request, string? ip, CancellationToken ct);
    Task LogoutAsync(RefreshRequest request, CancellationToken ct);
    Task LogoutAllAsync(int userId, CancellationToken ct);
}
