using Microsoft.EntityFrameworkCore;
using PIA.Application.Abstractions;
using PIA.Domain.Entities;
using PIA.Infrastructure.Persistence;

namespace PIA.Infrastructure.Services.Organization;

/// <summary>
/// Generates PIA-{DEPT}-{yyyy}-{NNNN} using SELECT ... FOR UPDATE row locking so two concurrent
/// intern creations in the same department/year serialize on that one row instead of racing.
/// The very first code for a (department, year) pair has no row to lock yet, so a duplicate-key
/// insert race is possible there only - handled with a bounded retry.
/// </summary>
public sealed class InternCodeGenerator(PiaDbContext db, IClock clock) : IInternCodeGenerator
{
    public async Task<string> GenerateAsync(int departmentId, string departmentCode, CancellationToken ct)
    {
        var year = clock.TodayInPakistan.Year;

        // The retrying MySqlRetryingExecutionStrategy forbids ad-hoc BeginTransactionAsync unless the
        // whole begin/work/commit unit is replayed through it - CreateExecutionStrategy().ExecuteAsync
        // is what makes that safe for transient connection failures.
        var strategy = db.Database.CreateExecutionStrategy();

        for (var attempt = 0; attempt < 5; attempt++)
        {
            try
            {
                return await strategy.ExecuteAsync(async () =>
                {
                    await using var transaction = await db.Database.BeginTransactionAsync(ct);

                    var sequence = await db.DepartmentCodeSequences
                        .FromSqlInterpolated(
                            $"SELECT * FROM department_code_sequences WHERE department_id = {departmentId} AND year = {year} FOR UPDATE")
                        .FirstOrDefaultAsync(ct);

                    int assignedValue;
                    if (sequence is null)
                    {
                        assignedValue = 1;
                        db.DepartmentCodeSequences.Add(new DepartmentCodeSequence
                        {
                            DepartmentId = departmentId,
                            Year = year,
                            NextValue = 2,
                        });
                    }
                    else
                    {
                        assignedValue = sequence.NextValue;
                        sequence.NextValue++;
                    }

                    await db.SaveChangesAsync(ct);
                    await transaction.CommitAsync(ct);
                    return $"PIA-{departmentCode}-{year}-{assignedValue:D4}";
                });
            }
            catch (DbUpdateException) when (attempt < 4)
            {
                // Only the very first code for a (department, year) pair can race this way - two
                // concurrent transactions both find no row and both try to insert it.
                db.ChangeTracker.Clear();
                await Task.Delay(Random.Shared.Next(10, 50), ct);
            }
        }

        throw new InvalidOperationException("Could not generate a unique intern code after multiple attempts.");
    }
}
