using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PIA.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class FaceEnrollmentReview : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Stores the best captured enrollment frame as a file (FileCategory.FaceEnrollmentCapture)
            // so a mentor/admin can visually compare it against the intern's approved profile photo
            // during manual review - see FaceTemplate.CapturedImageFileId's doc comment.
            migrationBuilder.AddColumn<Guid>(
                name: "captured_image_file_id",
                table: "face_templates",
                type: "char(36)",
                nullable: true,
                collation: "ascii_general_ci");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "captured_image_file_id",
                table: "face_templates");
        }
    }
}
