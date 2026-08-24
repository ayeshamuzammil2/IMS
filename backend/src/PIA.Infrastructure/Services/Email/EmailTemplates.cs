namespace PIA.Infrastructure.Services.Email;

public sealed record EmailTemplateDefinition(string SubjectTemplate, string BodyTemplate);

/// <summary>
/// The single wording catalog for every templated email. Body templates are wrapped in
/// {{layout}} by ScribanEmailTemplateRenderer; each is just the inner content block.
/// </summary>
public static class EmailTemplates
{
    public const string Layout = """
        <!doctype html>
        <html>
        <body style="margin:0;padding:0;background-color:#E8F5E9;font-family:Arial,Helvetica,sans-serif;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#E8F5E9;padding:24px 0;">
            <tr><td align="center">
              <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="background-color:#FFFFFF;border-radius:12px;overflow:hidden;">
                <tr><td style="background-color:#1B5E20;padding:20px 28px;">
                  <span style="color:#FFFFFF;font-size:18px;font-weight:bold;">PIA Wings</span>
                </td></tr>
                <tr><td style="padding:28px;color:#14261A;font-size:15px;line-height:1.6;">
                  {{ content }}
                </td></tr>
                <tr><td style="padding:16px 28px;background-color:#F4FBF4;color:#5C7764;font-size:12px;">
                  This is an automated message from the PIA Wings Intern Operations Portal. Please do not reply to this email.
                </td></tr>
              </table>
            </td></tr>
          </table>
        </body>
        </html>
        """;

    public static readonly IReadOnlyDictionary<string, EmailTemplateDefinition> Definitions = new Dictionary<string, EmailTemplateDefinition>
    {
        ["mentor-welcome"] = new(
            "Welcome to PIA Wings - your mentor account",
            """
            <p>Hello {{ full_name }},</p>
            <p>An administrator has created a mentor account for you in the <strong>{{ department_name }}</strong> department.</p>
            <p>Sign in with your email address and the password your administrator gave you. You will be asked to set a new password immediately.</p>
            <p>If you weren't expecting this account, please contact your administrator.</p>
            """
        ),
        ["intern-welcome"] = new(
            "Welcome to PIA Wings - your internship account",
            """
            <p>Hello {{ full_name }},</p>
            <p>Welcome to Pakistan International Airlines! Your mentor, <strong>{{ mentor_name }}</strong>, has created your
               internship account in the <strong>{{ department_name }}</strong> department.</p>
            <p><strong>Internship period:</strong> {{ start_date }} to {{ end_date }}<br/>
               <strong>Daily timing:</strong> {{ daily_start_time }} - {{ daily_end_time }}</p>
            <p>Sign in with your email address and the password your admin or mentor gave you. You will be asked to set a new password immediately.</p>
            <p>Next steps once you sign in: upload your profile photo (passport-style, white or blue background), submit your
               CNIC/resume/reference letter, and submit your GitHub repository link.</p>
            """
        ),
        ["password-reset-by-admin"] = new(
            "Your PIA Wings password has been reset",
            """
            <p>Hello {{ full_name }},</p>
            <p>An administrator or mentor has reset your password. Sign in with the new password they gave you - you will be asked to set a new one immediately.</p>
            """
        ),
        ["password-changed"] = new(
            "Your PIA Wings password was changed",
            """
            <p>Hello {{ full_name }},</p>
            <p>This is a confirmation that your password was just changed. If you made this change, no action is needed.</p>
            <p>If you did <strong>not</strong> change your password, please contact your administrator immediately.</p>
            """
        ),
        ["account-deactivated"] = new(
            "Your PIA Wings account has been deactivated",
            """
            <p>Hello {{ full_name }},</p>
            <p>Your account has been deactivated by an administrator. If you believe this is a mistake, please contact them directly.</p>
            """
        ),
    };
}
