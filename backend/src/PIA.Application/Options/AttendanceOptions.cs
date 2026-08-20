namespace PIA.Application.Options;

public sealed class AttendanceOptions
{
    public const string SectionName = "Attendance";

    public int LateGraceMinutes { get; set; } = 15;
    public int EarlyLeaveGraceMinutes { get; set; } = 15;
    public int SessionTtlSeconds { get; set; } = 30;
    public int SelfieRetentionDays { get; set; } = 180;

    /// <summary>Sanity guard against absurd mark times (e.g. a clock-skewed device) - loose on
    /// purpose since shifts vary; the real authority is DailyStartTime/DailyEndTime per intern.</summary>
    public int EarliestMarkHourLocal { get; set; } = 5;
    public int LatestMarkHourLocal { get; set; } = 23;

    /// <summary>How many mentor-approved manual overrides an intern can receive per calendar
    /// month before a request requires admin countersignature instead of auto-approving.</summary>
    public int OverrideMonthlyQuota { get; set; } = 3;

    public int MinOverrideJustificationLength { get; set; } = 20;
}
