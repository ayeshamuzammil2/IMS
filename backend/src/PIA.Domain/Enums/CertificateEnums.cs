namespace PIA.Domain.Enums;

public enum CertificateStatus
{
    Locked,
    Eligible,
    PendingApproval,
    Approved,
    Issued,
    Rejected,
}

public enum IdCardStatus
{
    Draft,
    PendingApproval,
    Approved,
    Issued,
    Rejected,
}

public enum CertificateRenderedBy
{
    DocxTemplate,
    BuiltInLayout,
}
