using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PIA.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class FaceEnrollmentLock : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Face enrollment is now locked-by-default after the first successful capture (see
            // InternProfile.FaceReEnrollmentAllowed's doc comment) - only an admin unlocking this
            // flag lets an already-enrolled intern submit one more enrollment.
            migrationBuilder.AddColumn<bool>(
                name: "face_re_enrollment_allowed",
                table: "intern_profiles",
                type: "tinyint(1)",
                nullable: false,
                defaultValue: false);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "face_re_enrollment_allowed",
                table: "intern_profiles");
        }
    }
}
