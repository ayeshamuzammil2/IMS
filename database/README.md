# Database

EF Core Code-First migrations are the single source of truth for the schema — there is no
hand-written `schema.sql` in this project (v1's copy, which had drifted out of sync with the
actual EF model, is preserved for reference at `../v1-reference/database/schema.sql`).

## First-time setup

1. Install MySQL Server 8.0+ and make sure it's running.
2. Create the database user/credentials you'll use, then set the connection string via user-secrets
   (never commit it — see `backend/src/PIA.Api` setup below).
3. From the repo root:
   ```
   cd backend/src/PIA.Api
   dotnet user-secrets set "ConnectionStrings:DefaultConnection" "Server=localhost;Port=3306;Database=pia_internship_system;User=root;Password=YOUR_PASSWORD;AllowPublicKeyRetrieval=True;SslMode=None;"
   dotnet user-secrets set "Jwt:Key" "<a random string, at least 64 characters>"
   ```
   A quick way to generate a random key: `openssl rand -base64 64` (or any password generator set to 64+ characters).
4. Generate the initial migration (only needed once, or after a model change):
   ```
   dotnet tool install --global dotnet-ef   # first time only
   dotnet ef migrations add InitialCreate --project ../PIA.Infrastructure --startup-project .
   ```
5. In **Development**, `dotnet run` applies migrations automatically on startup. In **Production**,
   apply them explicitly as a deploy step and never automatically:
   ```
   dotnet ef database update --project ../PIA.Infrastructure --startup-project .
   ```

## Regenerating `schema.generated.sql`

After adding a migration, regenerate the human-readable reference copy (this file is generated,
never hand-edited):

```
dotnet ef migrations script --idempotent --project ../PIA.Infrastructure --startup-project . -o ../../database/schema.generated.sql
```

## Conventions

- Tables and columns are `snake_case` (via `EFCore.NamingConventions`); C# stays `PascalCase`.
- Enums are stored as `VARCHAR(40)` strings, never MySQL native `ENUM` and never `int` — see
  `PiaDbContext.OnModelCreating` for why.
- Every `DateTime` column is UTC (property names end in `...Utc`); calendar-local dates/times use
  `DateOnly`/`TimeOnly` and are Pakistan-local (Asia/Karachi, UTC+5, no DST).
