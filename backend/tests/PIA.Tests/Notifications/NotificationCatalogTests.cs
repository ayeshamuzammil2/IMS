using System.Reflection;
using FluentAssertions;
using PIA.Application.Notifications;
using Xunit;

namespace PIA.Tests.Notifications;

/// <summary>
/// Reads the catalog via reflection rather than a hand-maintained list of fields, so it can never
/// go stale by omission - the one thing it must be told by hand is which workflow keys are
/// mandatory, which is exactly the "a workflow can't ship without a notification" regression net
/// NotificationTemplates.cs's own doc comment promises. Add a key here whenever a new
/// intern-facing state change is wired to a notification.
/// </summary>
public sealed class NotificationCatalogTests
{
    private static readonly string[] MandatoryWorkflowKeys =
    [
        "account.created.mentor",
        "account.created.intern",
        "account.password_reset_by_admin",
        "account.password_changed",
        "account.deactivated",
        "document.approved",
        "document.rejected",
        "verification.completed",
        "github.approved",
        "github.rejected",
        "github.resubmit_requested",
        "project.assigned",
        "certificate.issued",
        "idcard.issued",
    ];

    private static IReadOnlyList<NotificationTemplate> AllTemplates() =>
        typeof(NotificationTemplates)
            .GetFields(BindingFlags.Public | BindingFlags.Static)
            .Where(f => f.FieldType == typeof(NotificationTemplate))
            .Select(f => (NotificationTemplate)f.GetValue(null)!)
            .ToList();

    [Fact]
    public void EveryTemplate_HasNonEmptyKeyTitleAndBody()
    {
        foreach (var template in AllTemplates())
        {
            template.Key.Should().NotBeNullOrWhiteSpace();
            template.TitleTemplate.Should().NotBeNullOrWhiteSpace();
            template.BodyTemplate.Should().NotBeNullOrWhiteSpace();
        }
    }

    [Fact]
    public void EveryTemplate_HasAUniqueKey()
    {
        var keys = AllTemplates().Select(t => t.Key).ToList();
        keys.Should().OnlyHaveUniqueItems();
    }

    [Fact]
    public void EveryTemplate_KeyFollowsDotNotationConvention()
    {
        foreach (var template in AllTemplates())
        {
            template.Key.Should().MatchRegex("^[a-z]+(\\.[a-z_]+)+$",
                $"'{template.Key}' should be lowercase dot-separated, e.g. 'document.approved'");
        }
    }

    [Fact]
    public void MandatoryWorkflowKeys_AllExistInTheCatalog()
    {
        var actualKeys = AllTemplates().Select(t => t.Key).ToHashSet();
        var missing = MandatoryWorkflowKeys.Where(k => !actualKeys.Contains(k)).ToList();

        missing.Should().BeEmpty("every mandatory workflow must keep firing a notification - " +
            "if this fails, either the template was renamed/removed or the workflow no longer notifies");
    }
}
