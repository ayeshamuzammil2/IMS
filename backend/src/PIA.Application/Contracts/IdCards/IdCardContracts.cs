namespace PIA.Application.Contracts.IdCards;

public sealed record SubmitIdCardRequest(string? Designation);

public sealed record IdCardDto(
    int InternProfileId,
    string? InternFullName,
    string? InternCode,
    string? DepartmentName,
    string? CardNumber,
    string Status,
    Guid? GeneratedFileId,
    DateOnly? ValidUntil,
    string? RejectionReason);
