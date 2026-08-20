using System;
using Microsoft.EntityFrameworkCore.Metadata;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PIA.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class InitialCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterDatabase()
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "attendance_challenge_sessions",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "char(36)", nullable: false, collation: "ascii_general_ci"),
                    intern_profile_id = table.Column<int>(type: "int", nullable: false),
                    user_id = table.Column<int>(type: "int", nullable: false),
                    event_type = table.Column<string>(type: "varchar(40)", maxLength: 40, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    date_pk = table.Column<DateOnly>(type: "date", nullable: false),
                    nonce = table.Column<byte[]>(type: "varbinary(32)", nullable: false),
                    challenge_json = table.Column<string>(type: "json", nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    jwt_jti = table.Column<string>(type: "varchar(64)", maxLength: 64, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    device_id = table.Column<string>(type: "varchar(128)", maxLength: 128, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    issue_latitude = table.Column<decimal>(type: "decimal(10,7)", nullable: true),
                    issue_longitude = table.Column<decimal>(type: "decimal(10,7)", nullable: true),
                    issue_distance_m = table.Column<double>(type: "double", nullable: true),
                    issue_geofence_state = table.Column<string>(type: "varchar(40)", maxLength: 40, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    state = table.Column<string>(type: "varchar(40)", maxLength: 40, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    issued_at_utc = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    expires_at_utc = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    submitted_at_utc = table.Column<DateTime>(type: "datetime(6)", nullable: true),
                    completed_at_utc = table.Column<DateTime>(type: "datetime(6)", nullable: true),
                    client_ip = table.Column<string>(type: "varchar(45)", maxLength: 45, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    user_agent = table.Column<string>(type: "varchar(255)", maxLength: 255, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4")
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_attendance_challenge_sessions", x => x.id);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "attendance_events",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    attendance_day_id = table.Column<long>(type: "bigint", nullable: true),
                    intern_profile_id = table.Column<int>(type: "int", nullable: false),
                    event_type = table.Column<string>(type: "varchar(40)", maxLength: 40, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    outcome = table.Column<string>(type: "varchar(40)", maxLength: 40, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    occurred_at_utc = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    latitude = table.Column<decimal>(type: "decimal(10,7)", nullable: false),
                    longitude = table.Column<decimal>(type: "decimal(10,7)", nullable: false),
                    accuracy_m = table.Column<decimal>(type: "decimal(7,2)", nullable: true),
                    distance_from_department_m = table.Column<double>(type: "double", nullable: false),
                    geofence_state = table.Column<string>(type: "varchar(40)", maxLength: 40, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    selfie_file_id = table.Column<Guid>(type: "char(36)", nullable: true, collation: "ascii_general_ci"),
                    face_verification_result_id = table.Column<long>(type: "bigint", nullable: true),
                    challenge_session_id = table.Column<Guid>(type: "char(36)", nullable: true, collation: "ascii_general_ci"),
                    device_model = table.Column<string>(type: "varchar(100)", maxLength: 100, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    app_version = table.Column<string>(type: "varchar(30)", maxLength: 30, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    created_at_utc = table.Column<DateTime>(type: "datetime(6)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_attendance_events", x => x.id);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "attendance_media",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    attempt_id = table.Column<long>(type: "bigint", nullable: false),
                    intern_profile_id = table.Column<int>(type: "int", nullable: false),
                    slot = table.Column<string>(type: "varchar(16)", maxLength: 16, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    kind = table.Column<string>(type: "varchar(30)", maxLength: 30, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    storage_key = table.Column<string>(type: "varchar(300)", maxLength: 300, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    encrypted = table.Column<bool>(type: "tinyint(1)", nullable: false),
                    content_type = table.Column<string>(type: "varchar(100)", maxLength: 100, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    bytes = table.Column<int>(type: "int", nullable: false),
                    sha256 = table.Column<byte[]>(type: "binary(32)", nullable: false),
                    phash = table.Column<ulong>(type: "bigint unsigned", nullable: false),
                    width = table.Column<short>(type: "smallint", nullable: true),
                    height = table.Column<short>(type: "smallint", nullable: true),
                    is_primary = table.Column<bool>(type: "tinyint(1)", nullable: false),
                    retention_expires_at_utc = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    purged_at_utc = table.Column<DateTime>(type: "datetime(6)", nullable: true),
                    created_at_utc = table.Column<DateTime>(type: "datetime(6)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_attendance_media", x => x.id);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "attendance_overrides",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    attendance_day_id = table.Column<long>(type: "bigint", nullable: true),
                    intern_profile_id = table.Column<int>(type: "int", nullable: false),
                    date_pk = table.Column<DateOnly>(type: "date", nullable: false),
                    event_type = table.Column<string>(type: "varchar(40)", maxLength: 40, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    requested_by_user_id = table.Column<int>(type: "int", nullable: false),
                    requested_at_utc = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    reason_code = table.Column<string>(type: "varchar(60)", maxLength: 60, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    request_note = table.Column<string>(type: "varchar(500)", maxLength: 500, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    decided_by_user_id = table.Column<int>(type: "int", nullable: true),
                    decided_by_role = table.Column<string>(type: "varchar(20)", maxLength: 20, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    decided_at_utc = table.Column<DateTime>(type: "datetime(6)", nullable: true),
                    decision = table.Column<string>(type: "varchar(20)", maxLength: 20, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    justification = table.Column<string>(type: "varchar(1000)", maxLength: 1000, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    marked_at_utc = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    geofence_state_at_request = table.Column<string>(type: "varchar(40)", maxLength: 40, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    distance_m = table.Column<double>(type: "double", nullable: true),
                    quota_exceeded = table.Column<bool>(type: "tinyint(1)", nullable: false),
                    admin_countersigned_by_user_id = table.Column<int>(type: "int", nullable: true),
                    client_ip = table.Column<string>(type: "varchar(45)", maxLength: 45, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    user_agent = table.Column<string>(type: "varchar(255)", maxLength: 255, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4")
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_attendance_overrides", x => x.id);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "attendance_verification_attempts",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    session_id = table.Column<Guid>(type: "char(36)", nullable: false, collation: "ascii_general_ci"),
                    intern_profile_id = table.Column<int>(type: "int", nullable: false),
                    attendance_day_id = table.Column<long>(type: "bigint", nullable: true),
                    face_template_id = table.Column<long>(type: "bigint", nullable: true),
                    event_type = table.Column<string>(type: "varchar(40)", maxLength: 40, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    date_pk = table.Column<DateOnly>(type: "date", nullable: false),
                    attempt_number = table.Column<int>(type: "int", nullable: false),
                    verdict = table.Column<string>(type: "varchar(20)", maxLength: 20, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    internal_reason_code = table.Column<string>(type: "varchar(60)", maxLength: 60, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    client_reason_code = table.Column<string>(type: "varchar(40)", maxLength: 40, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    face_match_score = table.Column<decimal>(type: "decimal(65,30)", nullable: true),
                    face_match_best_other = table.Column<decimal>(type: "decimal(65,30)", nullable: true),
                    pad_live_prob_best = table.Column<decimal>(type: "decimal(65,30)", nullable: true),
                    pad_live_prob_mean = table.Column<decimal>(type: "decimal(65,30)", nullable: true),
                    quality_score = table.Column<decimal>(type: "decimal(65,30)", nullable: true),
                    blur_variance = table.Column<decimal>(type: "decimal(65,30)", nullable: true),
                    risk_score = table.Column<int>(type: "int", nullable: false),
                    flags_json = table.Column<string>(type: "json", nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    trace_json = table.Column<string>(type: "json", nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    geofence_state = table.Column<string>(type: "varchar(40)", maxLength: 40, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    distance_m = table.Column<double>(type: "double", nullable: true),
                    gps_accuracy_m = table.Column<decimal>(type: "decimal(7,2)", nullable: true),
                    location_mocked = table.Column<bool>(type: "tinyint(1)", nullable: true),
                    attestation_verdict = table.Column<string>(type: "varchar(60)", maxLength: 60, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    device_id = table.Column<string>(type: "varchar(128)", maxLength: 128, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    frame_count = table.Column<int>(type: "int", nullable: true),
                    payload_bytes = table.Column<int>(type: "int", nullable: true),
                    server_latency_ms = table.Column<int>(type: "int", nullable: true),
                    created_at_utc = table.Column<DateTime>(type: "datetime(6)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_attendance_verification_attempts", x => x.id);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "audit_logs",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    actor_user_id = table.Column<int>(type: "int", nullable: true),
                    actor_role = table.Column<string>(type: "varchar(20)", maxLength: 20, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    action = table.Column<string>(type: "varchar(120)", maxLength: 120, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    entity_type = table.Column<string>(type: "varchar(80)", maxLength: 80, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    entity_id = table.Column<string>(type: "varchar(40)", maxLength: 40, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    before_json = table.Column<string>(type: "json", nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    after_json = table.Column<string>(type: "json", nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    ip_address = table.Column<string>(type: "varchar(45)", maxLength: 45, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    user_agent = table.Column<string>(type: "varchar(256)", maxLength: 256, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    correlation_id = table.Column<string>(type: "varchar(64)", maxLength: 64, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    created_at_utc = table.Column<DateTime>(type: "datetime(6)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_audit_logs", x => x.id);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "certificate_templates",
                columns: table => new
                {
                    id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    name = table.Column<string>(type: "varchar(150)", maxLength: 150, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    department_id = table.Column<int>(type: "int", nullable: true),
                    file_id = table.Column<Guid>(type: "char(36)", nullable: false, collation: "ascii_general_ci"),
                    merge_fields_json = table.Column<string>(type: "json", nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    uploaded_by_user_id = table.Column<int>(type: "int", nullable: false),
                    is_active = table.Column<bool>(type: "tinyint(1)", nullable: false),
                    created_at_utc = table.Column<DateTime>(type: "datetime(6)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_certificate_templates", x => x.id);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "departments",
                columns: table => new
                {
                    id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    name = table.Column<string>(type: "varchar(150)", maxLength: 150, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    code = table.Column<string>(type: "varchar(10)", maxLength: 10, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    description = table.Column<string>(type: "varchar(2000)", maxLength: 2000, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    latitude = table.Column<decimal>(type: "decimal(10,7)", nullable: false),
                    longitude = table.Column<decimal>(type: "decimal(10,7)", nullable: false),
                    geofence_radius_meters = table.Column<int>(type: "int", nullable: false),
                    is_active = table.Column<bool>(type: "tinyint(1)", nullable: false),
                    created_at_utc = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    updated_at_utc = table.Column<DateTime>(type: "datetime(6)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_departments", x => x.id);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "device_bindings",
                columns: table => new
                {
                    id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    intern_profile_id = table.Column<int>(type: "int", nullable: false),
                    device_id = table.Column<string>(type: "varchar(128)", maxLength: 128, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    first_seen_at_utc = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    bound_at_utc = table.Column<DateTime>(type: "datetime(6)", nullable: true),
                    bound_by_user_id = table.Column<int>(type: "int", nullable: true),
                    status = table.Column<string>(type: "varchar(20)", maxLength: 20, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    model = table.Column<string>(type: "varchar(100)", maxLength: 100, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    os_version = table.Column<string>(type: "varchar(30)", maxLength: 30, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    last_attestation_verdict = table.Column<string>(type: "varchar(60)", maxLength: 60, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    last_seen_at_utc = table.Column<DateTime>(type: "datetime(6)", nullable: true),
                    revoked_at_utc = table.Column<DateTime>(type: "datetime(6)", nullable: true),
                    revoke_reason = table.Column<string>(type: "varchar(255)", maxLength: 255, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4")
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_device_bindings", x => x.id);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "email_outbox_messages",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "char(36)", nullable: false, collation: "ascii_general_ci"),
                    to_address = table.Column<string>(type: "varchar(254)", maxLength: 254, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    to_name = table.Column<string>(type: "varchar(150)", maxLength: 150, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    subject = table.Column<string>(type: "varchar(255)", maxLength: 255, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    html_body = table.Column<string>(type: "mediumtext", nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    text_body = table.Column<string>(type: "mediumtext", nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    template_key = table.Column<string>(type: "varchar(80)", maxLength: 80, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    attachment_file_ids_json = table.Column<string>(type: "json", nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    status = table.Column<string>(type: "varchar(40)", maxLength: 40, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    attempt_count = table.Column<int>(type: "int", nullable: false),
                    next_attempt_at_utc = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    last_error = table.Column<string>(type: "varchar(1000)", maxLength: 1000, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    created_at_utc = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    sent_at_utc = table.Column<DateTime>(type: "datetime(6)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_email_outbox_messages", x => x.id);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "face_verification_results",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    intern_profile_id = table.Column<int>(type: "int", nullable: false),
                    provider_name = table.Column<string>(type: "varchar(50)", maxLength: 50, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    live_score = table.Column<decimal>(type: "decimal(6,5)", nullable: true),
                    print_attack_score = table.Column<decimal>(type: "decimal(6,5)", nullable: true),
                    replay_attack_score = table.Column<decimal>(type: "decimal(6,5)", nullable: true),
                    passive_passed = table.Column<bool>(type: "tinyint(1)", nullable: false),
                    active_challenge_passed = table.Column<bool>(type: "tinyint(1)", nullable: false),
                    match_similarity = table.Column<decimal>(type: "decimal(6,5)", nullable: true),
                    match_threshold = table.Column<decimal>(type: "decimal(6,5)", nullable: true),
                    match_passed = table.Column<bool>(type: "tinyint(1)", nullable: false),
                    overall_passed = table.Column<bool>(type: "tinyint(1)", nullable: false),
                    failure_reason = table.Column<string>(type: "varchar(120)", maxLength: 120, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    frames_evaluated = table.Column<int>(type: "int", nullable: false),
                    latency_ms = table.Column<int>(type: "int", nullable: false),
                    raw_payload_json = table.Column<string>(type: "json", nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    created_at_utc = table.Column<DateTime>(type: "datetime(6)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_face_verification_results", x => x.id);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "holidays",
                columns: table => new
                {
                    id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    date = table.Column<DateOnly>(type: "date", nullable: false),
                    name = table.Column<string>(type: "varchar(150)", maxLength: 150, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    department_id = table.Column<int>(type: "int", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_holidays", x => x.id);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "job_runs",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    job_name = table.Column<string>(type: "varchar(100)", maxLength: 100, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    started_at_utc = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    finished_at_utc = table.Column<DateTime>(type: "datetime(6)", nullable: true),
                    succeeded = table.Column<bool>(type: "tinyint(1)", nullable: false),
                    items_processed = table.Column<int>(type: "int", nullable: false),
                    error = table.Column<string>(type: "varchar(2000)", maxLength: 2000, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    triggered_by = table.Column<string>(type: "varchar(40)", maxLength: 40, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4")
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_job_runs", x => x.id);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "stored_files",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "char(36)", nullable: false, collation: "ascii_general_ci"),
                    category = table.Column<string>(type: "varchar(40)", maxLength: 40, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    owner_user_id = table.Column<int>(type: "int", nullable: true),
                    uploaded_by_user_id = table.Column<int>(type: "int", nullable: false),
                    storage_key = table.Column<string>(type: "varchar(300)", maxLength: 300, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    original_file_name = table.Column<string>(type: "varchar(255)", maxLength: 255, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    content_type = table.Column<string>(type: "varchar(100)", maxLength: 100, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    size_bytes = table.Column<long>(type: "bigint", nullable: false),
                    sha256 = table.Column<string>(type: "varchar(64)", maxLength: 64, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    is_deleted = table.Column<bool>(type: "tinyint(1)", nullable: false),
                    created_at_utc = table.Column<DateTime>(type: "datetime(6)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_stored_files", x => x.id);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "department_code_sequences",
                columns: table => new
                {
                    department_id = table.Column<int>(type: "int", nullable: false),
                    year = table.Column<int>(type: "int", nullable: false),
                    next_value = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_department_code_sequences", x => new { x.department_id, x.year });
                    table.ForeignKey(
                        name: "fk_department_code_sequences_departments_department_id",
                        column: x => x.department_id,
                        principalTable: "departments",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "users",
                columns: table => new
                {
                    id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    role = table.Column<string>(type: "varchar(40)", maxLength: 40, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    full_name = table.Column<string>(type: "varchar(150)", maxLength: 150, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    email = table.Column<string>(type: "varchar(150)", maxLength: 150, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    phone = table.Column<string>(type: "varchar(20)", maxLength: 20, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    cnic = table.Column<string>(type: "varchar(13)", maxLength: 13, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    password_hash = table.Column<string>(type: "varchar(255)", maxLength: 255, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    must_reset_password = table.Column<bool>(type: "tinyint(1)", nullable: false),
                    password_changed_at_utc = table.Column<DateTime>(type: "datetime(6)", nullable: true),
                    security_stamp = table.Column<string>(type: "varchar(64)", maxLength: 64, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    department_id = table.Column<int>(type: "int", nullable: true),
                    is_active = table.Column<bool>(type: "tinyint(1)", nullable: false),
                    deactivated_at_utc = table.Column<DateTime>(type: "datetime(6)", nullable: true),
                    failed_login_count = table.Column<int>(type: "int", nullable: false),
                    lockout_end_utc = table.Column<DateTime>(type: "datetime(6)", nullable: true),
                    last_login_at_utc = table.Column<DateTime>(type: "datetime(6)", nullable: true),
                    created_at_utc = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    updated_at_utc = table.Column<DateTime>(type: "datetime(6)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_users", x => x.id);
                    table.ForeignKey(
                        name: "fk_users_departments_department_id",
                        column: x => x.department_id,
                        principalTable: "departments",
                        principalColumn: "id",
                        onDelete: ReferentialAction.SetNull);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "intern_profiles",
                columns: table => new
                {
                    id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    user_id = table.Column<int>(type: "int", nullable: false),
                    mentor_id = table.Column<int>(type: "int", nullable: false),
                    intern_code = table.Column<string>(type: "varchar(30)", maxLength: 30, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    internship_start_date = table.Column<DateOnly>(type: "date", nullable: false),
                    internship_end_date = table.Column<DateOnly>(type: "date", nullable: false),
                    daily_start_time = table.Column<TimeOnly>(type: "time(6)", nullable: false),
                    daily_end_time = table.Column<TimeOnly>(type: "time(6)", nullable: false),
                    university_name = table.Column<string>(type: "varchar(200)", maxLength: 200, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    degree_program = table.Column<string>(type: "varchar(150)", maxLength: 150, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    address = table.Column<string>(type: "varchar(500)", maxLength: 500, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    emergency_contact_name = table.Column<string>(type: "varchar(150)", maxLength: 150, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    emergency_contact_phone = table.Column<string>(type: "varchar(20)", maxLength: 20, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    blood_group = table.Column<string>(type: "varchar(5)", maxLength: 5, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    verification_status = table.Column<string>(type: "varchar(40)", maxLength: 40, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    verification_remarks = table.Column<string>(type: "varchar(500)", maxLength: 500, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    verified_by_user_id = table.Column<int>(type: "int", nullable: true),
                    verified_at_utc = table.Column<DateTime>(type: "datetime(6)", nullable: true),
                    profile_photo_status = table.Column<string>(type: "varchar(40)", maxLength: 40, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    profile_photo_approved_by_user_id = table.Column<int>(type: "int", nullable: true),
                    profile_photo_approved_at_utc = table.Column<DateTime>(type: "datetime(6)", nullable: true),
                    approved_photo_file_id = table.Column<Guid>(type: "char(36)", nullable: true, collation: "ascii_general_ci"),
                    face_enrollment_status = table.Column<string>(type: "varchar(40)", maxLength: 40, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    github_repo_url = table.Column<string>(type: "varchar(255)", maxLength: 255, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    github_status = table.Column<string>(type: "varchar(40)", maxLength: 40, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    self_details_submitted = table.Column<bool>(type: "tinyint(1)", nullable: false),
                    self_details_submitted_at_utc = table.Column<DateTime>(type: "datetime(6)", nullable: true),
                    profile_locked = table.Column<bool>(type: "tinyint(1)", nullable: false),
                    attendance_accommodation = table.Column<string>(type: "varchar(40)", maxLength: 40, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    attendance_accommodation_reason = table.Column<string>(type: "varchar(500)", maxLength: 500, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    attendance_accommodation_expires_on = table.Column<DateOnly>(type: "date", nullable: true),
                    created_at_utc = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    updated_at_utc = table.Column<DateTime>(type: "datetime(6)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_intern_profiles", x => x.id);
                    table.ForeignKey(
                        name: "fk_intern_profiles_users_mentor_id",
                        column: x => x.mentor_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_intern_profiles_users_user_id",
                        column: x => x.user_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "notifications",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    recipient_user_id = table.Column<int>(type: "int", nullable: false),
                    title = table.Column<string>(type: "varchar(150)", maxLength: 150, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    body = table.Column<string>(type: "varchar(1000)", maxLength: 1000, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    type = table.Column<string>(type: "varchar(40)", maxLength: 40, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    category = table.Column<string>(type: "varchar(40)", maxLength: 40, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    related_entity_type = table.Column<string>(type: "varchar(80)", maxLength: 80, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    related_entity_id = table.Column<string>(type: "varchar(40)", maxLength: 40, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    action_route = table.Column<string>(type: "varchar(200)", maxLength: 200, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    is_read = table.Column<bool>(type: "tinyint(1)", nullable: false),
                    read_at_utc = table.Column<DateTime>(type: "datetime(6)", nullable: true),
                    created_at_utc = table.Column<DateTime>(type: "datetime(6)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_notifications", x => x.id);
                    table.ForeignKey(
                        name: "fk_notifications_users_recipient_user_id",
                        column: x => x.recipient_user_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "refresh_tokens",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "char(36)", nullable: false, collation: "ascii_general_ci"),
                    user_id = table.Column<int>(type: "int", nullable: false),
                    token_hash = table.Column<string>(type: "varchar(64)", maxLength: 64, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    expires_at_utc = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    created_at_utc = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    created_by_ip = table.Column<string>(type: "varchar(45)", maxLength: 45, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    revoked_at_utc = table.Column<DateTime>(type: "datetime(6)", nullable: true),
                    replaced_by_token_id = table.Column<Guid>(type: "char(36)", nullable: true, collation: "ascii_general_ci"),
                    revoked_reason = table.Column<string>(type: "varchar(255)", maxLength: 255, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4")
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_refresh_tokens", x => x.id);
                    table.ForeignKey(
                        name: "fk_refresh_tokens_users_user_id",
                        column: x => x.user_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "attendance_days",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    intern_profile_id = table.Column<int>(type: "int", nullable: false),
                    work_date = table.Column<DateOnly>(type: "date", nullable: false),
                    status = table.Column<string>(type: "varchar(40)", maxLength: 40, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    arrival_event_id = table.Column<long>(type: "bigint", nullable: true),
                    arrival_at_utc = table.Column<DateTime>(type: "datetime(6)", nullable: true),
                    arrival_lat = table.Column<decimal>(type: "decimal(10,7)", nullable: true),
                    arrival_lng = table.Column<decimal>(type: "decimal(10,7)", nullable: true),
                    arrival_accuracy_m = table.Column<decimal>(type: "decimal(7,2)", nullable: true),
                    arrival_distance_m = table.Column<double>(type: "double", nullable: true),
                    arrival_geofence = table.Column<string>(type: "varchar(40)", maxLength: 40, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    arrival_source = table.Column<string>(type: "varchar(40)", maxLength: 40, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    arrival_mode = table.Column<string>(type: "varchar(40)", maxLength: 40, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    departure_event_id = table.Column<long>(type: "bigint", nullable: true),
                    departure_at_utc = table.Column<DateTime>(type: "datetime(6)", nullable: true),
                    departure_lat = table.Column<decimal>(type: "decimal(10,7)", nullable: true),
                    departure_lng = table.Column<decimal>(type: "decimal(10,7)", nullable: true),
                    departure_accuracy_m = table.Column<decimal>(type: "decimal(7,2)", nullable: true),
                    departure_distance_m = table.Column<double>(type: "double", nullable: true),
                    departure_geofence = table.Column<string>(type: "varchar(40)", maxLength: 40, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    departure_source = table.Column<string>(type: "varchar(40)", maxLength: 40, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    departure_mode = table.Column<string>(type: "varchar(40)", maxLength: 40, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    worked_minutes = table.Column<int>(type: "int", nullable: true),
                    is_late = table.Column<bool>(type: "tinyint(1)", nullable: false),
                    is_early_leave = table.Column<bool>(type: "tinyint(1)", nullable: false),
                    auto_closed = table.Column<bool>(type: "tinyint(1)", nullable: false),
                    marked_by_system = table.Column<bool>(type: "tinyint(1)", nullable: false),
                    requires_review = table.Column<bool>(type: "tinyint(1)", nullable: false),
                    reviewed_by_user_id = table.Column<int>(type: "int", nullable: true),
                    reviewed_at_utc = table.Column<DateTime>(type: "datetime(6)", nullable: true),
                    voided_at_utc = table.Column<DateTime>(type: "datetime(6)", nullable: true),
                    voided_by_user_id = table.Column<int>(type: "int", nullable: true),
                    void_reason = table.Column<string>(type: "varchar(500)", maxLength: 500, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    created_at_utc = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    updated_at_utc = table.Column<DateTime>(type: "datetime(6)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_attendance_days", x => x.id);
                    table.ForeignKey(
                        name: "fk_attendance_days_intern_profiles_intern_profile_id",
                        column: x => x.intern_profile_id,
                        principalTable: "intern_profiles",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "certificates",
                columns: table => new
                {
                    id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    intern_profile_id = table.Column<int>(type: "int", nullable: false),
                    certificate_number = table.Column<string>(type: "varchar(50)", maxLength: 50, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    status = table.Column<string>(type: "varchar(40)", maxLength: 40, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    template_id = table.Column<int>(type: "int", nullable: true),
                    generated_file_id = table.Column<Guid>(type: "char(36)", nullable: true, collation: "ascii_general_ci"),
                    approved_by_user_id = table.Column<int>(type: "int", nullable: true),
                    approved_at_utc = table.Column<DateTime>(type: "datetime(6)", nullable: true),
                    issued_by_user_id = table.Column<int>(type: "int", nullable: true),
                    issued_at_utc = table.Column<DateTime>(type: "datetime(6)", nullable: true),
                    issue_date = table.Column<DateOnly>(type: "date", nullable: true),
                    rejection_reason = table.Column<string>(type: "varchar(500)", maxLength: 500, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    rendered_by = table.Column<string>(type: "varchar(40)", maxLength: 40, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    created_at_utc = table.Column<DateTime>(type: "datetime(6)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_certificates", x => x.id);
                    table.ForeignKey(
                        name: "fk_certificates_intern_profiles_intern_profile_id",
                        column: x => x.intern_profile_id,
                        principalTable: "intern_profiles",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "face_templates",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    intern_profile_id = table.Column<int>(type: "int", nullable: false),
                    version = table.Column<int>(type: "int", nullable: false),
                    provider = table.Column<string>(type: "varchar(40)", maxLength: 40, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    model_id = table.Column<string>(type: "varchar(100)", maxLength: 100, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    model_version = table.Column<string>(type: "varchar(50)", maxLength: 50, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    embedding = table.Column<byte[]>(type: "varbinary(2048)", nullable: true),
                    embedding_dim = table.Column<short>(type: "smallint", nullable: true),
                    embedding_norm = table.Column<decimal>(type: "decimal(65,30)", nullable: true),
                    external_face_id = table.Column<string>(type: "varchar(120)", maxLength: 120, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    external_collection = table.Column<string>(type: "varchar(120)", maxLength: 120, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    source_session_id = table.Column<Guid>(type: "char(36)", nullable: false, collation: "ascii_general_ci"),
                    quality_score = table.Column<decimal>(type: "decimal(65,30)", nullable: true),
                    cross_match_score = table.Column<decimal>(type: "decimal(65,30)", nullable: true),
                    intra_set_min_score = table.Column<decimal>(type: "decimal(65,30)", nullable: true),
                    enrollment_reason = table.Column<string>(type: "varchar(40)", maxLength: 40, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    is_active = table.Column<bool>(type: "tinyint(1)", nullable: false),
                    created_by_user_id = table.Column<int>(type: "int", nullable: false),
                    created_at_utc = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    superseded_at_utc = table.Column<DateTime>(type: "datetime(6)", nullable: true),
                    superseded_by_template_id = table.Column<long>(type: "bigint", nullable: true),
                    revoked_at_utc = table.Column<DateTime>(type: "datetime(6)", nullable: true),
                    revoked_reason = table.Column<string>(type: "varchar(255)", maxLength: 255, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4")
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_face_templates", x => x.id);
                    table.ForeignKey(
                        name: "fk_face_templates_intern_profiles_intern_profile_id",
                        column: x => x.intern_profile_id,
                        principalTable: "intern_profiles",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "github_submissions",
                columns: table => new
                {
                    id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    intern_profile_id = table.Column<int>(type: "int", nullable: false),
                    repository_url = table.Column<string>(type: "varchar(255)", maxLength: 255, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    version = table.Column<int>(type: "int", nullable: false),
                    status = table.Column<string>(type: "varchar(40)", maxLength: 40, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    submitted_at_utc = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    reviewed_by_user_id = table.Column<int>(type: "int", nullable: true),
                    reviewed_at_utc = table.Column<DateTime>(type: "datetime(6)", nullable: true),
                    rejection_reason = table.Column<string>(type: "varchar(500)", maxLength: 500, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4")
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_github_submissions", x => x.id);
                    table.ForeignKey(
                        name: "fk_github_submissions_intern_profiles_intern_profile_id",
                        column: x => x.intern_profile_id,
                        principalTable: "intern_profiles",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "id_cards",
                columns: table => new
                {
                    id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    intern_profile_id = table.Column<int>(type: "int", nullable: false),
                    card_number = table.Column<string>(type: "varchar(50)", maxLength: 50, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    status = table.Column<string>(type: "varchar(40)", maxLength: 40, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    blood_group = table.Column<string>(type: "varchar(5)", maxLength: 5, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    emergency_contact_name = table.Column<string>(type: "varchar(150)", maxLength: 150, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    emergency_contact_phone = table.Column<string>(type: "varchar(20)", maxLength: 20, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    address = table.Column<string>(type: "varchar(500)", maxLength: 500, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    designation = table.Column<string>(type: "varchar(100)", maxLength: 100, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    valid_until = table.Column<DateOnly>(type: "date", nullable: false),
                    generated_file_id = table.Column<Guid>(type: "char(36)", nullable: true, collation: "ascii_general_ci"),
                    submitted_at_utc = table.Column<DateTime>(type: "datetime(6)", nullable: true),
                    approved_by_user_id = table.Column<int>(type: "int", nullable: true),
                    approved_at_utc = table.Column<DateTime>(type: "datetime(6)", nullable: true),
                    issued_by_user_id = table.Column<int>(type: "int", nullable: true),
                    issued_at_utc = table.Column<DateTime>(type: "datetime(6)", nullable: true),
                    rejection_reason = table.Column<string>(type: "varchar(500)", maxLength: 500, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    created_at_utc = table.Column<DateTime>(type: "datetime(6)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_id_cards", x => x.id);
                    table.ForeignKey(
                        name: "fk_id_cards_intern_profiles_intern_profile_id",
                        column: x => x.intern_profile_id,
                        principalTable: "intern_profiles",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "intern_documents",
                columns: table => new
                {
                    id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    intern_profile_id = table.Column<int>(type: "int", nullable: false),
                    document_type = table.Column<string>(type: "varchar(40)", maxLength: 40, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    file_id = table.Column<Guid>(type: "char(36)", nullable: false, collation: "ascii_general_ci"),
                    version = table.Column<int>(type: "int", nullable: false),
                    status = table.Column<string>(type: "varchar(40)", maxLength: 40, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    remarks = table.Column<string>(type: "varchar(500)", maxLength: 500, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    uploaded_at_utc = table.Column<DateTime>(type: "datetime(6)", nullable: false),
                    reviewed_by_user_id = table.Column<int>(type: "int", nullable: true),
                    reviewed_at_utc = table.Column<DateTime>(type: "datetime(6)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_intern_documents", x => x.id);
                    table.ForeignKey(
                        name: "fk_intern_documents_intern_profiles_intern_profile_id",
                        column: x => x.intern_profile_id,
                        principalTable: "intern_profiles",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateTable(
                name: "project_assignments",
                columns: table => new
                {
                    id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("MySql:ValueGenerationStrategy", MySqlValueGenerationStrategy.IdentityColumn),
                    intern_profile_id = table.Column<int>(type: "int", nullable: false),
                    assigned_by_user_id = table.Column<int>(type: "int", nullable: false),
                    title = table.Column<string>(type: "varchar(200)", maxLength: 200, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    description = table.Column<string>(type: "varchar(2000)", maxLength: 2000, nullable: true)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    file_id = table.Column<Guid>(type: "char(36)", nullable: true, collation: "ascii_general_ci"),
                    due_date = table.Column<DateOnly>(type: "date", nullable: true),
                    status = table.Column<string>(type: "varchar(40)", maxLength: 40, nullable: false)
                        .Annotation("MySql:CharSet", "utf8mb4"),
                    assigned_at_utc = table.Column<DateTime>(type: "datetime(6)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_project_assignments", x => x.id);
                    table.ForeignKey(
                        name: "fk_project_assignments_intern_profiles_intern_profile_id",
                        column: x => x.intern_profile_id,
                        principalTable: "intern_profiles",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                })
                .Annotation("MySql:CharSet", "utf8mb4");

            migrationBuilder.CreateIndex(
                name: "ix_attendance_challenge_sessions_intern_profile_id_state_expire",
                table: "attendance_challenge_sessions",
                columns: new[] { "intern_profile_id", "state", "expires_at_utc" });

            migrationBuilder.CreateIndex(
                name: "ix_attendance_challenge_sessions_nonce",
                table: "attendance_challenge_sessions",
                column: "nonce",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_attendance_challenge_sessions_state_expires_at_utc",
                table: "attendance_challenge_sessions",
                columns: new[] { "state", "expires_at_utc" });

            migrationBuilder.CreateIndex(
                name: "ix_attendance_days_intern_profile_id_work_date",
                table: "attendance_days",
                columns: new[] { "intern_profile_id", "work_date" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_attendance_days_work_date_status",
                table: "attendance_days",
                columns: new[] { "work_date", "status" });

            migrationBuilder.CreateIndex(
                name: "ix_attendance_events_intern_profile_id_occurred_at_utc",
                table: "attendance_events",
                columns: new[] { "intern_profile_id", "occurred_at_utc" });

            migrationBuilder.CreateIndex(
                name: "ix_attendance_media_phash",
                table: "attendance_media",
                column: "phash");

            migrationBuilder.CreateIndex(
                name: "ix_attendance_media_retention_expires_at_utc_purged_at_utc",
                table: "attendance_media",
                columns: new[] { "retention_expires_at_utc", "purged_at_utc" });

            migrationBuilder.CreateIndex(
                name: "ix_attendance_overrides_intern_profile_id_date_pk",
                table: "attendance_overrides",
                columns: new[] { "intern_profile_id", "date_pk" });

            migrationBuilder.CreateIndex(
                name: "ix_attendance_verification_attempts_intern_profile_id_date_pk",
                table: "attendance_verification_attempts",
                columns: new[] { "intern_profile_id", "date_pk" });

            migrationBuilder.CreateIndex(
                name: "ix_attendance_verification_attempts_verdict_risk_score_created_",
                table: "attendance_verification_attempts",
                columns: new[] { "verdict", "risk_score", "created_at_utc" });

            migrationBuilder.CreateIndex(
                name: "ix_audit_logs_actor_user_id_created_at_utc",
                table: "audit_logs",
                columns: new[] { "actor_user_id", "created_at_utc" });

            migrationBuilder.CreateIndex(
                name: "ix_audit_logs_entity_type_entity_id",
                table: "audit_logs",
                columns: new[] { "entity_type", "entity_id" });

            migrationBuilder.CreateIndex(
                name: "ix_certificates_certificate_number",
                table: "certificates",
                column: "certificate_number",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_certificates_intern_profile_id",
                table: "certificates",
                column: "intern_profile_id",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_departments_code",
                table: "departments",
                column: "code",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_departments_name",
                table: "departments",
                column: "name",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_device_bindings_intern_profile_id_device_id",
                table: "device_bindings",
                columns: new[] { "intern_profile_id", "device_id" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_email_outbox_messages_status_next_attempt_at_utc",
                table: "email_outbox_messages",
                columns: new[] { "status", "next_attempt_at_utc" });

            migrationBuilder.CreateIndex(
                name: "ix_face_templates_intern_profile_id_is_active",
                table: "face_templates",
                columns: new[] { "intern_profile_id", "is_active" });

            migrationBuilder.CreateIndex(
                name: "ix_face_templates_intern_profile_id_version",
                table: "face_templates",
                columns: new[] { "intern_profile_id", "version" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_github_submissions_intern_profile_id_version",
                table: "github_submissions",
                columns: new[] { "intern_profile_id", "version" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_holidays_date_department_id",
                table: "holidays",
                columns: new[] { "date", "department_id" });

            migrationBuilder.CreateIndex(
                name: "ix_id_cards_card_number",
                table: "id_cards",
                column: "card_number",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_id_cards_intern_profile_id",
                table: "id_cards",
                column: "intern_profile_id",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_intern_documents_intern_profile_id_document_type_version",
                table: "intern_documents",
                columns: new[] { "intern_profile_id", "document_type", "version" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_intern_profiles_intern_code",
                table: "intern_profiles",
                column: "intern_code",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_intern_profiles_mentor_id",
                table: "intern_profiles",
                column: "mentor_id");

            migrationBuilder.CreateIndex(
                name: "ix_intern_profiles_user_id",
                table: "intern_profiles",
                column: "user_id",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_job_runs_job_name_started_at_utc",
                table: "job_runs",
                columns: new[] { "job_name", "started_at_utc" });

            migrationBuilder.CreateIndex(
                name: "ix_notifications_recipient_user_id_is_read_created_at_utc",
                table: "notifications",
                columns: new[] { "recipient_user_id", "is_read", "created_at_utc" });

            migrationBuilder.CreateIndex(
                name: "ix_project_assignments_intern_profile_id",
                table: "project_assignments",
                column: "intern_profile_id");

            migrationBuilder.CreateIndex(
                name: "ix_refresh_tokens_token_hash",
                table: "refresh_tokens",
                column: "token_hash",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_refresh_tokens_user_id",
                table: "refresh_tokens",
                column: "user_id");

            migrationBuilder.CreateIndex(
                name: "ix_stored_files_owner_user_id",
                table: "stored_files",
                column: "owner_user_id");

            migrationBuilder.CreateIndex(
                name: "ix_users_cnic",
                table: "users",
                column: "cnic",
                unique: true,
                filter: "`cnic` IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "ix_users_department_id",
                table: "users",
                column: "department_id");

            migrationBuilder.CreateIndex(
                name: "ix_users_email",
                table: "users",
                column: "email",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_users_role_department_id",
                table: "users",
                columns: new[] { "role", "department_id" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "attendance_challenge_sessions");

            migrationBuilder.DropTable(
                name: "attendance_days");

            migrationBuilder.DropTable(
                name: "attendance_events");

            migrationBuilder.DropTable(
                name: "attendance_media");

            migrationBuilder.DropTable(
                name: "attendance_overrides");

            migrationBuilder.DropTable(
                name: "attendance_verification_attempts");

            migrationBuilder.DropTable(
                name: "audit_logs");

            migrationBuilder.DropTable(
                name: "certificate_templates");

            migrationBuilder.DropTable(
                name: "certificates");

            migrationBuilder.DropTable(
                name: "department_code_sequences");

            migrationBuilder.DropTable(
                name: "device_bindings");

            migrationBuilder.DropTable(
                name: "email_outbox_messages");

            migrationBuilder.DropTable(
                name: "face_templates");

            migrationBuilder.DropTable(
                name: "face_verification_results");

            migrationBuilder.DropTable(
                name: "github_submissions");

            migrationBuilder.DropTable(
                name: "holidays");

            migrationBuilder.DropTable(
                name: "id_cards");

            migrationBuilder.DropTable(
                name: "intern_documents");

            migrationBuilder.DropTable(
                name: "job_runs");

            migrationBuilder.DropTable(
                name: "notifications");

            migrationBuilder.DropTable(
                name: "project_assignments");

            migrationBuilder.DropTable(
                name: "refresh_tokens");

            migrationBuilder.DropTable(
                name: "stored_files");

            migrationBuilder.DropTable(
                name: "intern_profiles");

            migrationBuilder.DropTable(
                name: "users");

            migrationBuilder.DropTable(
                name: "departments");
        }
    }
}
