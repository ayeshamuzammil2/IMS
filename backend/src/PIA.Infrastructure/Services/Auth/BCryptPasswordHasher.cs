using PIA.Application.Abstractions;

namespace PIA.Infrastructure.Services.Auth;

public sealed class BCryptPasswordHasher : IPasswordHasher
{
    private const int WorkFactor = 12;

    public string Hash(string plainTextPassword) => BCrypt.Net.BCrypt.HashPassword(plainTextPassword, WorkFactor);

    public bool Verify(string plainTextPassword, string hash) => BCrypt.Net.BCrypt.Verify(plainTextPassword, hash);
}
