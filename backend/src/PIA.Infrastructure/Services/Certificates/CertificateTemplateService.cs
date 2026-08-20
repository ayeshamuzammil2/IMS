using System.Text.Json;
using DocumentFormat.OpenXml.Packaging;
using Microsoft.EntityFrameworkCore;
using PIA.Application.Abstractions;
using PIA.Application.Contracts.Certificates;
using PIA.Domain.Entities;
using PIA.Domain.Enums;
using PIA.Domain.Exceptions;
using PIA.Infrastructure.Persistence;

namespace PIA.Infrastructure.Services.Certificates;

public sealed class CertificateTemplateService(
    PiaDbContext db,
    ICurrentUser currentUser,
    IFileStorage fileStorage,
    ICertificateDocxRenderer renderer,
    IClock clock) : ICertificateTemplateService
{
    private const string DocxContentType = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

    public async Task<IReadOnlyList<CertificateTemplateDto>> ListAsync(CancellationToken ct)
    {
        var rows = await db.CertificateTemplates.AsNoTracking()
            .OrderByDescending(t => t.CreatedAtUtc)
            .ToListAsync(ct);
        return rows.Select(ToDto).ToList();
    }

    public async Task<CertificateTemplateDto> UploadAsync(UploadCertificateTemplateRequest request, CancellationToken ct)
    {
        using var buffer = new MemoryStream();
        await request.Content.CopyToAsync(buffer, ct);
        var bytes = buffer.ToArray();

        List<string> fieldNames;
        try
        {
            using var docStream = new MemoryStream(bytes);
            using var wordDoc = WordprocessingDocument.Open(docStream, false);
            var body = wordDoc.MainDocumentPart?.Document.Body
                ?? throw new BusinessRuleException(BusinessRuleCodes.CorruptFile, "The document has no readable content.");
            fieldNames = MergeFieldExtractor.ExtractFieldNames(body).ToList();
        }
        catch (Exception ex) when (ex is not BusinessRuleException)
        {
            throw new BusinessRuleException(BusinessRuleCodes.CorruptFile, "The .docx file could not be processed. Please re-save it in Word and try again.");
        }

        var unknownFields = fieldNames.Where(f => !CertificateMergeFields.KnownFields.Contains(f)).ToList();
        if (unknownFields.Count > 0)
        {
            throw new BusinessRuleException(BusinessRuleCodes.TemplateUnknownMergeFields,
                $"Unrecognized merge field(s): {string.Join(", ", unknownFields)}. Supported fields: {string.Join(", ", CertificateMergeFields.KnownFields)}.");
        }

        var storedFile = await fileStorage.SaveAsync(new FileSaveRequest(
            new MemoryStream(bytes), request.FileName, DocxContentType, FileCategory.CertificateTemplate,
            null, currentUser.UserId), ct);

        var template = new CertificateTemplate
        {
            Name = request.Name,
            DepartmentId = request.DepartmentId,
            FileId = storedFile.Id,
            MergeFieldsJson = JsonSerializer.Serialize(fieldNames),
            UploadedByUserId = currentUser.UserId,
            IsActive = true,
            CreatedAtUtc = clock.UtcNow,
        };
        db.CertificateTemplates.Add(template);
        await db.SaveChangesAsync(ct);

        return ToDto(template);
    }

    public async Task<GeneratedFileResult> PreviewAsync(int templateId, CancellationToken ct)
    {
        var template = await db.CertificateTemplates.AsNoTracking().FirstOrDefaultAsync(t => t.Id == templateId, ct)
            ?? throw new NotFoundException(nameof(CertificateTemplate), templateId);

        var sampleData = CertificateMergeFields.BuildSampleData();
        var rendered = await renderer.RenderAsync(template.FileId, sampleData, "certificate-preview", ct);
        return rendered.File;
    }

    private static CertificateTemplateDto ToDto(CertificateTemplate t) => new(
        t.Id, t.Name, t.DepartmentId,
        string.IsNullOrEmpty(t.MergeFieldsJson) ? [] : JsonSerializer.Deserialize<List<string>>(t.MergeFieldsJson) ?? [],
        t.IsActive, t.CreatedAtUtc);
}
