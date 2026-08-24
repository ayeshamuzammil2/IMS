using System;
using Microsoft.EntityFrameworkCore.Metadata;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PIA.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class PhaseOneToFiveSchema : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "profile_locked",
                table: "intern_profiles");

            migrationBuilder.AddColumn<bool>(
                name: "is_locked_for_unofficial_activity",
                table: "users",
                type: "tinyint(1)",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "unofficial_activity_reason",
                table: "users",
                type: "longtext",
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.AddColumn<int>(
                name: "consecutive_face_failures",
                table: "intern_profiles",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<DateTime>(
                name: "last_face_failure_at_utc",
                table: "intern_profiles",
                type: "datetime(6)",
                nullable: true);

            migrationBuilder.AlterColumn<Guid>(
                name: "file_id",
                table: "intern_documents",
                type: "char(36)",
                nullable: true,
                collation: "ascii_general_ci",
                oldClrType: typeof(Guid),
                oldType: "char(36)")
                .OldAnnotation("Relational:Collation", "ascii_general_ci");

            migrationBuilder.AddColumn<string>(
                name: "external_link_url",
                table: "intern_documents",
                type: "varchar(2000)",
                maxLength: 2000,
                nullable: true)
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "chat_messages",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    sender_user_id = table.Column<int>(type: "int", nullable: false),
                    recipient_user_id = table.Column<int>(type: "int", nullable: false),
                    body = table.Column<string>(type: "varchar(2000)", maxLength: 2000, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    sent_at_utc = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    read_at_utc = table.Column<DateTime>(type: "datetime(6)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_chat_messages", x => x.id);
                    table.ForeignKey(
                        name: "fk_chat_messages_users_recipient_user_id",
                        column: x => x.recipient_user_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_chat_messages_users_sender_user_id",
                        column: x => x.sender_user_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "push_tokens",
                columns: table => new
                {
                    id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    user_id = table.Column<int>(type: "int", nullable: false),
                    expo_push_token = table.Column<string>(type: "varchar(200)", maxLength: 200, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    device_id = table.Column<string>(type: "varchar(200)", maxLength: 200, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    is_active = table.Column<bool>(type: "tinyint(1)", nullable: false),
                    created_at_utc = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    last_used_at_utc = table.Column<DateTime>(type: "datetime(6)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_push_tokens", x => x.id);
                    table.ForeignKey(
                        name: "fk_push_tokens_users_user_id",
                        column: x => x.user_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateIndex(
                name: "ix_chat_messages_recipient_user_id_sender_user_id_sent_at_utc",
                table: "chat_messages",
                columns: new[] { "recipient_user_id", "sender_user_id", "sent_at_utc" });

            migrationBuilder.CreateIndex(
                name: "ix_chat_messages_sender_user_id_recipient_user_id_sent_at_utc",
                table: "chat_messages",
                columns: new[] { "sender_user_id", "recipient_user_id", "sent_at_utc" });

            migrationBuilder.CreateIndex(
                name: "ix_push_tokens_expo_push_token",
                table: "push_tokens",
                column: "expo_push_token",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_push_tokens_user_id_is_active",
                table: "push_tokens",
                columns: new[] { "user_id", "is_active" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "chat_messages");

            migrationBuilder.DropTable(
                name: "push_tokens");

            migrationBuilder.DropColumn(
                name: "is_locked_for_unofficial_activity",
                table: "users");

            migrationBuilder.DropColumn(
                name: "unofficial_activity_reason",
                table: "users");

            migrationBuilder.DropColumn(
                name: "consecutive_face_failures",
                table: "intern_profiles");

            migrationBuilder.DropColumn(
                name: "last_face_failure_at_utc",
                table: "intern_profiles");

            migrationBuilder.DropColumn(
                name: "external_link_url",
                table: "intern_documents");

            migrationBuilder.AddColumn<bool>(
                name: "profile_locked",
                table: "intern_profiles",
                type: "tinyint(1)",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AlterColumn<Guid>(
                name: "file_id",
                table: "intern_documents",
                type: "char(36)",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"),
                collation: "ascii_general_ci",
                oldClrType: typeof(Guid),
                oldType: "char(36)",
                oldNullable: true)
                .OldAnnotation("Relational:Collation", "ascii_general_ci");
        }
    }
}
