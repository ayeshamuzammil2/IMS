namespace PIA.Application.Contracts.Projects;

/// <summary>Content is a raw Stream (not IFormFile), matching IFileStorage.FileSaveRequest - the
/// Api-layer controller does the IFormFile translation. The file is optional: a project brief can
/// be text-only.</summary>
public sealed record AssignProjectRequest(
    string Title,
    string? Description,
    DateOnly? DueDate,
    Stream? Content,
    string? FileName,
    string? ContentType);

public sealed record ProjectAssignmentDto(
    int Id,
    int InternProfileId,
    string? InternFullName,
    string? InternCode,
    string Title,
    string? Description,
    Guid? FileId,
    DateOnly? DueDate,
    string Status,
    DateTime AssignedAtUtc);
