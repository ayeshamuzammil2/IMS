namespace PIA.Application.Contracts.IdCards;

/// <summary>Designation is mandatory - IdCardService.SubmitAsync rejects an empty/whitespace value
/// before generating or previewing anything.</summary>
public sealed record SubmitIdCardRequest(string Designation);

public sealed record IdCardDto(
    int InternProfileId,
    string? InternFullName,
    string? InternCode,
    string? DepartmentName,
    string? CardNumber,
    string Status,
    Guid? GeneratedFileId,
    DateOnly? ValidUntil,
    string? RejectionReason,
    string? Designation,
    string? Email,
    string? EmergencyContactPhone,
    Guid? PhotoFileId);
