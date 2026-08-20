namespace PIA.Application.Abstractions;

/// <summary>
/// Generates a cryptographically random, policy-compliant temporary password - used for
/// Forgot Password and admin/mentor-initiated resets. Replaces v1's client-side
/// `Temp${1000-9999}!` generator (~9000 possible values) shown in an Alert.
/// </summary>
public interface ITempPasswordGenerator
{
    string Generate();
}
