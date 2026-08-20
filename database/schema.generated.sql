CREATE TABLE IF NOT EXISTS `__EFMigrationsHistory` (
    `migration_id` varchar(150) CHARACTER SET utf8mb4 NOT NULL,
    `product_version` varchar(32) CHARACTER SET utf8mb4 NOT NULL,
    CONSTRAINT `pk___ef_migrations_history` PRIMARY KEY (`migration_id`)
) CHARACTER SET=utf8mb4;

START TRANSACTION;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `migration_id` = '20260815155810_InitialCreate') THEN

    ALTER DATABASE CHARACTER SET utf8mb4;

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `migration_id` = '20260815155810_InitialCreate') THEN

    CREATE TABLE `attendance_challenge_sessions` (
        `id` char(36) COLLATE ascii_general_ci NOT NULL,
        `intern_profile_id` int NOT NULL,
        `user_id` int NOT NULL,
        `event_type` varchar(40) CHARACTER SET utf8mb4 NULL,
        `date_pk` date NOT NULL,
        `nonce` varbinary(32) NOT NULL,
        `challenge_json` json NOT NULL,
        `jwt_jti` varchar(64) CHARACTER SET utf8mb4 NOT NULL,
        `device_id` varchar(128) CHARACTER SET utf8mb4 NOT NULL,
        `issue_latitude` decimal(10,7) NULL,
        `issue_longitude` decimal(10,7) NULL,
        `issue_distance_m` double NULL,
        `issue_geofence_state` varchar(40) CHARACTER SET utf8mb4 NULL,
        `state` varchar(40) CHARACTER SET utf8mb4 NOT NULL,
        `issued_at_utc` datetime(6) NOT NULL,
        `expires_at_utc` datetime(6) NOT NULL,
        `submitted_at_utc` datetime(6) NULL,
        `completed_at_utc` datetime(6) NULL,
        `client_ip` varchar(45) CHARACTER SET utf8mb4 NULL,
        `user_agent` varchar(255) CHARACTER SET utf8mb4 NULL,
        CONSTRAINT `pk_attendance_challenge_sessions` PRIMARY KEY (`id`)
    ) CHARACTER SET=utf8mb4;

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `migration_id` = '20260815155810_InitialCreate') THEN

    CREATE TABLE `attendance_events` (
        `id` bigint NOT NULL AUTO_INCREMENT,
        `attendance_day_id` bigint NULL,
        `intern_profile_id` int NOT NULL,
        `event_type` varchar(40) CHARACTER SET utf8mb4 NOT NULL,
        `outcome` varchar(40) CHARACTER SET utf8mb4 NOT NULL,
        `occurred_at_utc` datetime(6) NOT NULL,
        `latitude` decimal(10,7) NOT NULL,
        `longitude` decimal(10,7) NOT NULL,
        `accuracy_m` decimal(7,2) NULL,
        `distance_from_department_m` double NOT NULL,
        `geofence_state` varchar(40) CHARACTER SET utf8mb4 NOT NULL,
        `selfie_file_id` char(36) COLLATE ascii_general_ci NULL,
        `face_verification_result_id` bigint NULL,
        `challenge_session_id` char(36) COLLATE ascii_general_ci NULL,
        `device_model` varchar(100) CHARACTER SET utf8mb4 NULL,
        `app_version` varchar(30) CHARACTER SET utf8mb4 NULL,
        `created_at_utc` datetime(6) NOT NULL,
        CONSTRAINT `pk_attendance_events` PRIMARY KEY (`id`)
    ) CHARACTER SET=utf8mb4;

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `migration_id` = '20260815155810_InitialCreate') THEN

    CREATE TABLE `attendance_media` (
        `id` bigint NOT NULL AUTO_INCREMENT,
        `attempt_id` bigint NOT NULL,
        `intern_profile_id` int NOT NULL,
        `slot` varchar(16) CHARACTER SET utf8mb4 NOT NULL,
        `kind` varchar(30) CHARACTER SET utf8mb4 NOT NULL,
        `storage_key` varchar(300) CHARACTER SET utf8mb4 NOT NULL,
        `encrypted` tinyint(1) NOT NULL,
        `content_type` varchar(100) CHARACTER SET utf8mb4 NOT NULL,
        `bytes` int NOT NULL,
        `sha256` binary(32) NOT NULL,
        `phash` bigint unsigned NOT NULL,
        `width` smallint NULL,
        `height` smallint NULL,
        `is_primary` tinyint(1) NOT NULL,
        `retention_expires_at_utc` datetime(6) NOT NULL,
        `purged_at_utc` datetime(6) NULL,
        `created_at_utc` datetime(6) NOT NULL,
        CONSTRAINT `pk_attendance_media` PRIMARY KEY (`id`)
    ) CHARACTER SET=utf8mb4;

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `migration_id` = '20260815155810_InitialCreate') THEN

    CREATE TABLE `attendance_overrides` (
        `id` bigint NOT NULL AUTO_INCREMENT,
        `attendance_day_id` bigint NULL,
        `intern_profile_id` int NOT NULL,
        `date_pk` date NOT NULL,
        `event_type` varchar(40) CHARACTER SET utf8mb4 NOT NULL,
        `requested_by_user_id` int NOT NULL,
        `requested_at_utc` datetime(6) NOT NULL,
        `reason_code` varchar(60) CHARACTER SET utf8mb4 NOT NULL,
        `request_note` varchar(500) CHARACTER SET utf8mb4 NULL,
        `decided_by_user_id` int NULL,
        `decided_by_role` varchar(20) CHARACTER SET utf8mb4 NULL,
        `decided_at_utc` datetime(6) NULL,
        `decision` varchar(20) CHARACTER SET utf8mb4 NULL,
        `justification` varchar(1000) CHARACTER SET utf8mb4 NOT NULL,
        `marked_at_utc` datetime(6) NOT NULL,
        `geofence_state_at_request` varchar(40) CHARACTER SET utf8mb4 NULL,
        `distance_m` double NULL,
        `quota_exceeded` tinyint(1) NOT NULL,
        `admin_countersigned_by_user_id` int NULL,
        `client_ip` varchar(45) CHARACTER SET utf8mb4 NULL,
        `user_agent` varchar(255) CHARACTER SET utf8mb4 NULL,
        CONSTRAINT `pk_attendance_overrides` PRIMARY KEY (`id`)
    ) CHARACTER SET=utf8mb4;

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `migration_id` = '20260815155810_InitialCreate') THEN

    CREATE TABLE `attendance_verification_attempts` (
        `id` bigint NOT NULL AUTO_INCREMENT,
        `session_id` char(36) COLLATE ascii_general_ci NOT NULL,
        `intern_profile_id` int NOT NULL,
        `attendance_day_id` bigint NULL,
        `face_template_id` bigint NULL,
        `event_type` varchar(40) CHARACTER SET utf8mb4 NOT NULL,
        `date_pk` date NOT NULL,
        `attempt_number` int NOT NULL,
        `verdict` varchar(20) CHARACTER SET utf8mb4 NOT NULL,
        `internal_reason_code` varchar(60) CHARACTER SET utf8mb4 NULL,
        `client_reason_code` varchar(40) CHARACTER SET utf8mb4 NULL,
        `face_match_score` decimal(65,30) NULL,
        `face_match_best_other` decimal(65,30) NULL,
        `pad_live_prob_best` decimal(65,30) NULL,
        `pad_live_prob_mean` decimal(65,30) NULL,
        `quality_score` decimal(65,30) NULL,
        `blur_variance` decimal(65,30) NULL,
        `risk_score` int NOT NULL,
        `flags_json` json NULL,
        `trace_json` json NULL,
        `geofence_state` varchar(40) CHARACTER SET utf8mb4 NULL,
        `distance_m` double NULL,
        `gps_accuracy_m` decimal(7,2) NULL,
        `location_mocked` tinyint(1) NULL,
        `attestation_verdict` varchar(60) CHARACTER SET utf8mb4 NULL,
        `device_id` varchar(128) CHARACTER SET utf8mb4 NULL,
        `frame_count` int NULL,
        `payload_bytes` int NULL,
        `server_latency_ms` int NULL,
        `created_at_utc` datetime(6) NOT NULL,
        CONSTRAINT `pk_attendance_verification_attempts` PRIMARY KEY (`id`)
    ) CHARACTER SET=utf8mb4;

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `migration_id` = '20260815155810_InitialCreate') THEN

    CREATE TABLE `audit_logs` (
        `id` bigint NOT NULL AUTO_INCREMENT,
        `actor_user_id` int NULL,
        `actor_role` varchar(20) CHARACTER SET utf8mb4 NULL,
        `action` varchar(120) CHARACTER SET utf8mb4 NOT NULL,
        `entity_type` varchar(80) CHARACTER SET utf8mb4 NOT NULL,
        `entity_id` varchar(40) CHARACTER SET utf8mb4 NULL,
        `before_json` json NULL,
        `after_json` json NULL,
        `ip_address` varchar(45) CHARACTER SET utf8mb4 NULL,
        `user_agent` varchar(256) CHARACTER SET utf8mb4 NULL,
        `correlation_id` varchar(64) CHARACTER SET utf8mb4 NOT NULL,
        `created_at_utc` datetime(6) NOT NULL,
        CONSTRAINT `pk_audit_logs` PRIMARY KEY (`id`)
    ) CHARACTER SET=utf8mb4;

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `migration_id` = '20260815155810_InitialCreate') THEN

    CREATE TABLE `certificate_templates` (
        `id` int NOT NULL AUTO_INCREMENT,
        `name` varchar(150) CHARACTER SET utf8mb4 NOT NULL,
        `department_id` int NULL,
        `file_id` char(36) COLLATE ascii_general_ci NOT NULL,
        `merge_fields_json` json NULL,
        `uploaded_by_user_id` int NOT NULL,
        `is_active` tinyint(1) NOT NULL,
        `created_at_utc` datetime(6) NOT NULL,
        CONSTRAINT `pk_certificate_templates` PRIMARY KEY (`id`)
    ) CHARACTER SET=utf8mb4;

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `migration_id` = '20260815155810_InitialCreate') THEN

    CREATE TABLE `departments` (
        `id` int NOT NULL AUTO_INCREMENT,
        `name` varchar(150) CHARACTER SET utf8mb4 NOT NULL,
        `code` varchar(10) CHARACTER SET utf8mb4 NOT NULL,
        `description` varchar(2000) CHARACTER SET utf8mb4 NULL,
        `latitude` decimal(10,7) NOT NULL,
        `longitude` decimal(10,7) NOT NULL,
        `geofence_radius_meters` int NOT NULL,
        `is_active` tinyint(1) NOT NULL,
        `created_at_utc` datetime(6) NOT NULL,
        `updated_at_utc` datetime(6) NULL,
        CONSTRAINT `pk_departments` PRIMARY KEY (`id`)
    ) CHARACTER SET=utf8mb4;

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `migration_id` = '20260815155810_InitialCreate') THEN

    CREATE TABLE `device_bindings` (
        `id` int NOT NULL AUTO_INCREMENT,
        `intern_profile_id` int NOT NULL,
        `device_id` varchar(128) CHARACTER SET utf8mb4 NOT NULL,
        `first_seen_at_utc` datetime(6) NOT NULL,
        `bound_at_utc` datetime(6) NULL,
        `bound_by_user_id` int NULL,
        `status` varchar(20) CHARACTER SET utf8mb4 NOT NULL,
        `model` varchar(100) CHARACTER SET utf8mb4 NULL,
        `os_version` varchar(30) CHARACTER SET utf8mb4 NULL,
        `last_attestation_verdict` varchar(60) CHARACTER SET utf8mb4 NULL,
        `last_seen_at_utc` datetime(6) NULL,
        `revoked_at_utc` datetime(6) NULL,
        `revoke_reason` varchar(255) CHARACTER SET utf8mb4 NULL,
        CONSTRAINT `pk_device_bindings` PRIMARY KEY (`id`)
    ) CHARACTER SET=utf8mb4;

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `migration_id` = '20260815155810_InitialCreate') THEN

    CREATE TABLE `email_outbox_messages` (
        `id` char(36) COLLATE ascii_general_ci NOT NULL,
        `to_address` varchar(254) CHARACTER SET utf8mb4 NOT NULL,
        `to_name` varchar(150) CHARACTER SET utf8mb4 NULL,
        `subject` varchar(255) CHARACTER SET utf8mb4 NOT NULL,
        `html_body` mediumtext CHARACTER SET utf8mb4 NOT NULL,
        `text_body` mediumtext CHARACTER SET utf8mb4 NULL,
        `template_key` varchar(80) CHARACTER SET utf8mb4 NOT NULL,
        `attachment_file_ids_json` json NULL,
        `status` varchar(40) CHARACTER SET utf8mb4 NOT NULL,
        `attempt_count` int NOT NULL,
        `next_attempt_at_utc` datetime(6) NOT NULL,
        `last_error` varchar(1000) CHARACTER SET utf8mb4 NULL,
        `created_at_utc` datetime(6) NOT NULL,
        `sent_at_utc` datetime(6) NULL,
        CONSTRAINT `pk_email_outbox_messages` PRIMARY KEY (`id`)
    ) CHARACTER SET=utf8mb4;

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `migration_id` = '20260815155810_InitialCreate') THEN

    CREATE TABLE `face_verification_results` (
        `id` bigint NOT NULL AUTO_INCREMENT,
        `intern_profile_id` int NOT NULL,
        `provider_name` varchar(50) CHARACTER SET utf8mb4 NOT NULL,
        `live_score` decimal(6,5) NULL,
        `print_attack_score` decimal(6,5) NULL,
        `replay_attack_score` decimal(6,5) NULL,
        `passive_passed` tinyint(1) NOT NULL,
        `active_challenge_passed` tinyint(1) NOT NULL,
        `match_similarity` decimal(6,5) NULL,
        `match_threshold` decimal(6,5) NULL,
        `match_passed` tinyint(1) NOT NULL,
        `overall_passed` tinyint(1) NOT NULL,
        `failure_reason` varchar(120) CHARACTER SET utf8mb4 NULL,
        `frames_evaluated` int NOT NULL,
        `latency_ms` int NOT NULL,
        `raw_payload_json` json NULL,
        `created_at_utc` datetime(6) NOT NULL,
        CONSTRAINT `pk_face_verification_results` PRIMARY KEY (`id`)
    ) CHARACTER SET=utf8mb4;

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `migration_id` = '20260815155810_InitialCreate') THEN

    CREATE TABLE `holidays` (
        `id` int NOT NULL AUTO_INCREMENT,
        `date` date NOT NULL,
        `name` varchar(150) CHARACTER SET utf8mb4 NOT NULL,
        `department_id` int NULL,
        CONSTRAINT `pk_holidays` PRIMARY KEY (`id`)
    ) CHARACTER SET=utf8mb4;

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `migration_id` = '20260815155810_InitialCreate') THEN

    CREATE TABLE `job_runs` (
        `id` bigint NOT NULL AUTO_INCREMENT,
        `job_name` varchar(100) CHARACTER SET utf8mb4 NOT NULL,
        `started_at_utc` datetime(6) NOT NULL,
        `finished_at_utc` datetime(6) NULL,
        `succeeded` tinyint(1) NOT NULL,
        `items_processed` int NOT NULL,
        `error` varchar(2000) CHARACTER SET utf8mb4 NULL,
        `triggered_by` varchar(40) CHARACTER SET utf8mb4 NOT NULL,
        CONSTRAINT `pk_job_runs` PRIMARY KEY (`id`)
    ) CHARACTER SET=utf8mb4;

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `migration_id` = '20260815155810_InitialCreate') THEN

    CREATE TABLE `stored_files` (
        `id` char(36) COLLATE ascii_general_ci NOT NULL,
        `category` varchar(40) CHARACTER SET utf8mb4 NOT NULL,
        `owner_user_id` int NULL,
        `uploaded_by_user_id` int NOT NULL,
        `storage_key` varchar(300) CHARACTER SET utf8mb4 NOT NULL,
        `original_file_name` varchar(255) CHARACTER SET utf8mb4 NOT NULL,
        `content_type` varchar(100) CHARACTER SET utf8mb4 NOT NULL,
        `size_bytes` bigint NOT NULL,
        `sha256` varchar(64) CHARACTER SET utf8mb4 NOT NULL,
        `is_deleted` tinyint(1) NOT NULL,
        `created_at_utc` datetime(6) NOT NULL,
        CONSTRAINT `pk_stored_files` PRIMARY KEY (`id`)
    ) CHARACTER SET=utf8mb4;

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `migration_id` = '20260815155810_InitialCreate') THEN

    CREATE TABLE `department_code_sequences` (
        `department_id` int NOT NULL,
        `year` int NOT NULL,
        `next_value` int NOT NULL,
        CONSTRAINT `pk_department_code_sequences` PRIMARY KEY (`department_id`, `year`),
        CONSTRAINT `fk_department_code_sequences_departments_department_id` FOREIGN KEY (`department_id`) REFERENCES `departments` (`id`) ON DELETE CASCADE
    ) CHARACTER SET=utf8mb4;

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `migration_id` = '20260815155810_InitialCreate') THEN

    CREATE TABLE `users` (
        `id` int NOT NULL AUTO_INCREMENT,
        `role` varchar(40) CHARACTER SET utf8mb4 NOT NULL,
        `full_name` varchar(150) CHARACTER SET utf8mb4 NOT NULL,
        `email` varchar(150) CHARACTER SET utf8mb4 NOT NULL,
        `phone` varchar(20) CHARACTER SET utf8mb4 NULL,
        `cnic` varchar(13) CHARACTER SET utf8mb4 NULL,
        `password_hash` varchar(255) CHARACTER SET utf8mb4 NOT NULL,
        `must_reset_password` tinyint(1) NOT NULL,
        `password_changed_at_utc` datetime(6) NULL,
        `security_stamp` varchar(64) CHARACTER SET utf8mb4 NOT NULL,
        `department_id` int NULL,
        `is_active` tinyint(1) NOT NULL,
        `deactivated_at_utc` datetime(6) NULL,
        `failed_login_count` int NOT NULL,
        `lockout_end_utc` datetime(6) NULL,
        `last_login_at_utc` datetime(6) NULL,
        `created_at_utc` datetime(6) NOT NULL,
        `updated_at_utc` datetime(6) NULL,
        CONSTRAINT `pk_users` PRIMARY KEY (`id`),
        CONSTRAINT `fk_users_departments_department_id` FOREIGN KEY (`department_id`) REFERENCES `departments` (`id`) ON DELETE SET NULL
    ) CHARACTER SET=utf8mb4;

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `migration_id` = '20260815155810_InitialCreate') THEN

    CREATE TABLE `intern_profiles` (
        `id` int NOT NULL AUTO_INCREMENT,
        `user_id` int NOT NULL,
        `mentor_id` int NOT NULL,
        `intern_code` varchar(30) CHARACTER SET utf8mb4 NOT NULL,
        `internship_start_date` date NOT NULL,
        `internship_end_date` date NOT NULL,
        `daily_start_time` time(6) NOT NULL,
        `daily_end_time` time(6) NOT NULL,
        `university_name` varchar(200) CHARACTER SET utf8mb4 NULL,
        `degree_program` varchar(150) CHARACTER SET utf8mb4 NULL,
        `address` varchar(500) CHARACTER SET utf8mb4 NULL,
        `emergency_contact_name` varchar(150) CHARACTER SET utf8mb4 NULL,
        `emergency_contact_phone` varchar(20) CHARACTER SET utf8mb4 NULL,
        `blood_group` varchar(5) CHARACTER SET utf8mb4 NULL,
        `verification_status` varchar(40) CHARACTER SET utf8mb4 NOT NULL,
        `verification_remarks` varchar(500) CHARACTER SET utf8mb4 NULL,
        `verified_by_user_id` int NULL,
        `verified_at_utc` datetime(6) NULL,
        `profile_photo_status` varchar(40) CHARACTER SET utf8mb4 NOT NULL,
        `profile_photo_approved_by_user_id` int NULL,
        `profile_photo_approved_at_utc` datetime(6) NULL,
        `approved_photo_file_id` char(36) COLLATE ascii_general_ci NULL,
        `face_enrollment_status` varchar(40) CHARACTER SET utf8mb4 NOT NULL,
        `github_repo_url` varchar(255) CHARACTER SET utf8mb4 NULL,
        `github_status` varchar(40) CHARACTER SET utf8mb4 NOT NULL,
        `self_details_submitted` tinyint(1) NOT NULL,
        `self_details_submitted_at_utc` datetime(6) NULL,
        `profile_locked` tinyint(1) NOT NULL,
        `attendance_accommodation` varchar(40) CHARACTER SET utf8mb4 NOT NULL,
        `attendance_accommodation_reason` varchar(500) CHARACTER SET utf8mb4 NULL,
        `attendance_accommodation_expires_on` date NULL,
        `created_at_utc` datetime(6) NOT NULL,
        `updated_at_utc` datetime(6) NULL,
        CONSTRAINT `pk_intern_profiles` PRIMARY KEY (`id`),
        CONSTRAINT `fk_intern_profiles_users_mentor_id` FOREIGN KEY (`mentor_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT,
        CONSTRAINT `fk_intern_profiles_users_user_id` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
    ) CHARACTER SET=utf8mb4;

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `migration_id` = '20260815155810_InitialCreate') THEN

    CREATE TABLE `notifications` (
        `id` bigint NOT NULL AUTO_INCREMENT,
        `recipient_user_id` int NOT NULL,
        `title` varchar(150) CHARACTER SET utf8mb4 NOT NULL,
        `body` varchar(1000) CHARACTER SET utf8mb4 NOT NULL,
        `type` varchar(40) CHARACTER SET utf8mb4 NOT NULL,
        `category` varchar(40) CHARACTER SET utf8mb4 NOT NULL,
        `related_entity_type` varchar(80) CHARACTER SET utf8mb4 NULL,
        `related_entity_id` varchar(40) CHARACTER SET utf8mb4 NULL,
        `action_route` varchar(200) CHARACTER SET utf8mb4 NULL,
        `is_read` tinyint(1) NOT NULL,
        `read_at_utc` datetime(6) NULL,
        `created_at_utc` datetime(6) NOT NULL,
        CONSTRAINT `pk_notifications` PRIMARY KEY (`id`),
        CONSTRAINT `fk_notifications_users_recipient_user_id` FOREIGN KEY (`recipient_user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
    ) CHARACTER SET=utf8mb4;

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `migration_id` = '20260815155810_InitialCreate') THEN

    CREATE TABLE `refresh_tokens` (
        `id` char(36) COLLATE ascii_general_ci NOT NULL,
        `user_id` int NOT NULL,
        `token_hash` varchar(64) CHARACTER SET utf8mb4 NOT NULL,
        `expires_at_utc` datetime(6) NOT NULL,
        `created_at_utc` datetime(6) NOT NULL,
        `created_by_ip` varchar(45) CHARACTER SET utf8mb4 NULL,
        `revoked_at_utc` datetime(6) NULL,
        `replaced_by_token_id` char(36) COLLATE ascii_general_ci NULL,
        `revoked_reason` varchar(255) CHARACTER SET utf8mb4 NULL,
        CONSTRAINT `pk_refresh_tokens` PRIMARY KEY (`id`),
        CONSTRAINT `fk_refresh_tokens_users_user_id` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
    ) CHARACTER SET=utf8mb4;

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `migration_id` = '20260815155810_InitialCreate') THEN

    CREATE TABLE `attendance_days` (
        `id` bigint NOT NULL AUTO_INCREMENT,
        `intern_profile_id` int NOT NULL,
        `work_date` date NOT NULL,
        `status` varchar(40) CHARACTER SET utf8mb4 NOT NULL,
        `arrival_event_id` bigint NULL,
        `arrival_at_utc` datetime(6) NULL,
        `arrival_lat` decimal(10,7) NULL,
        `arrival_lng` decimal(10,7) NULL,
        `arrival_accuracy_m` decimal(7,2) NULL,
        `arrival_distance_m` double NULL,
        `arrival_geofence` varchar(40) CHARACTER SET utf8mb4 NULL,
        `arrival_source` varchar(40) CHARACTER SET utf8mb4 NULL,
        `arrival_mode` varchar(40) CHARACTER SET utf8mb4 NULL,
        `departure_event_id` bigint NULL,
        `departure_at_utc` datetime(6) NULL,
        `departure_lat` decimal(10,7) NULL,
        `departure_lng` decimal(10,7) NULL,
        `departure_accuracy_m` decimal(7,2) NULL,
        `departure_distance_m` double NULL,
        `departure_geofence` varchar(40) CHARACTER SET utf8mb4 NULL,
        `departure_source` varchar(40) CHARACTER SET utf8mb4 NULL,
        `departure_mode` varchar(40) CHARACTER SET utf8mb4 NULL,
        `worked_minutes` int NULL,
        `is_late` tinyint(1) NOT NULL,
        `is_early_leave` tinyint(1) NOT NULL,
        `auto_closed` tinyint(1) NOT NULL,
        `marked_by_system` tinyint(1) NOT NULL,
        `requires_review` tinyint(1) NOT NULL,
        `reviewed_by_user_id` int NULL,
        `reviewed_at_utc` datetime(6) NULL,
        `voided_at_utc` datetime(6) NULL,
        `voided_by_user_id` int NULL,
        `void_reason` varchar(500) CHARACTER SET utf8mb4 NULL,
        `created_at_utc` datetime(6) NOT NULL,
        `updated_at_utc` datetime(6) NULL,
        CONSTRAINT `pk_attendance_days` PRIMARY KEY (`id`),
        CONSTRAINT `fk_attendance_days_intern_profiles_intern_profile_id` FOREIGN KEY (`intern_profile_id`) REFERENCES `intern_profiles` (`id`) ON DELETE CASCADE
    ) CHARACTER SET=utf8mb4;

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `migration_id` = '20260815155810_InitialCreate') THEN

    CREATE TABLE `certificates` (
        `id` int NOT NULL AUTO_INCREMENT,
        `intern_profile_id` int NOT NULL,
        `certificate_number` varchar(50) CHARACTER SET utf8mb4 NOT NULL,
        `status` varchar(40) CHARACTER SET utf8mb4 NOT NULL,
        `template_id` int NULL,
        `generated_file_id` char(36) COLLATE ascii_general_ci NULL,
        `approved_by_user_id` int NULL,
        `approved_at_utc` datetime(6) NULL,
        `issued_by_user_id` int NULL,
        `issued_at_utc` datetime(6) NULL,
        `issue_date` date NULL,
        `rejection_reason` varchar(500) CHARACTER SET utf8mb4 NULL,
        `rendered_by` varchar(40) CHARACTER SET utf8mb4 NULL,
        `created_at_utc` datetime(6) NOT NULL,
        CONSTRAINT `pk_certificates` PRIMARY KEY (`id`),
        CONSTRAINT `fk_certificates_intern_profiles_intern_profile_id` FOREIGN KEY (`intern_profile_id`) REFERENCES `intern_profiles` (`id`) ON DELETE CASCADE
    ) CHARACTER SET=utf8mb4;

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `migration_id` = '20260815155810_InitialCreate') THEN

    CREATE TABLE `face_templates` (
        `id` bigint NOT NULL AUTO_INCREMENT,
        `intern_profile_id` int NOT NULL,
        `version` int NOT NULL,
        `provider` varchar(40) CHARACTER SET utf8mb4 NOT NULL,
        `model_id` varchar(100) CHARACTER SET utf8mb4 NOT NULL,
        `model_version` varchar(50) CHARACTER SET utf8mb4 NOT NULL,
        `embedding` varbinary(2048) NULL,
        `embedding_dim` smallint NULL,
        `embedding_norm` decimal(65,30) NULL,
        `external_face_id` varchar(120) CHARACTER SET utf8mb4 NULL,
        `external_collection` varchar(120) CHARACTER SET utf8mb4 NULL,
        `source_session_id` char(36) COLLATE ascii_general_ci NOT NULL,
        `quality_score` decimal(65,30) NULL,
        `cross_match_score` decimal(65,30) NULL,
        `intra_set_min_score` decimal(65,30) NULL,
        `enrollment_reason` varchar(40) CHARACTER SET utf8mb4 NOT NULL,
        `is_active` tinyint(1) NOT NULL,
        `created_by_user_id` int NOT NULL,
        `created_at_utc` datetime(6) NOT NULL,
        `superseded_at_utc` datetime(6) NULL,
        `superseded_by_template_id` bigint NULL,
        `revoked_at_utc` datetime(6) NULL,
        `revoked_reason` varchar(255) CHARACTER SET utf8mb4 NULL,
        CONSTRAINT `pk_face_templates` PRIMARY KEY (`id`),
        CONSTRAINT `fk_face_templates_intern_profiles_intern_profile_id` FOREIGN KEY (`intern_profile_id`) REFERENCES `intern_profiles` (`id`) ON DELETE CASCADE
    ) CHARACTER SET=utf8mb4;

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `migration_id` = '20260815155810_InitialCreate') THEN

    CREATE TABLE `github_submissions` (
        `id` int NOT NULL AUTO_INCREMENT,
        `intern_profile_id` int NOT NULL,
        `repository_url` varchar(255) CHARACTER SET utf8mb4 NOT NULL,
        `version` int NOT NULL,
        `status` varchar(40) CHARACTER SET utf8mb4 NOT NULL,
        `submitted_at_utc` datetime(6) NOT NULL,
        `reviewed_by_user_id` int NULL,
        `reviewed_at_utc` datetime(6) NULL,
        `rejection_reason` varchar(500) CHARACTER SET utf8mb4 NULL,
        CONSTRAINT `pk_github_submissions` PRIMARY KEY (`id`),
        CONSTRAINT `fk_github_submissions_intern_profiles_intern_profile_id` FOREIGN KEY (`intern_profile_id`) REFERENCES `intern_profiles` (`id`) ON DELETE CASCADE
    ) CHARACTER SET=utf8mb4;

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `migration_id` = '20260815155810_InitialCreate') THEN

    CREATE TABLE `id_cards` (
        `id` int NOT NULL AUTO_INCREMENT,
        `intern_profile_id` int NOT NULL,
        `card_number` varchar(50) CHARACTER SET utf8mb4 NOT NULL,
        `status` varchar(40) CHARACTER SET utf8mb4 NOT NULL,
        `blood_group` varchar(5) CHARACTER SET utf8mb4 NULL,
        `emergency_contact_name` varchar(150) CHARACTER SET utf8mb4 NULL,
        `emergency_contact_phone` varchar(20) CHARACTER SET utf8mb4 NULL,
        `address` varchar(500) CHARACTER SET utf8mb4 NULL,
        `designation` varchar(100) CHARACTER SET utf8mb4 NULL,
        `valid_until` date NOT NULL,
        `generated_file_id` char(36) COLLATE ascii_general_ci NULL,
        `submitted_at_utc` datetime(6) NULL,
        `approved_by_user_id` int NULL,
        `approved_at_utc` datetime(6) NULL,
        `issued_by_user_id` int NULL,
        `issued_at_utc` datetime(6) NULL,
        `rejection_reason` varchar(500) CHARACTER SET utf8mb4 NULL,
        `created_at_utc` datetime(6) NOT NULL,
        CONSTRAINT `pk_id_cards` PRIMARY KEY (`id`),
        CONSTRAINT `fk_id_cards_intern_profiles_intern_profile_id` FOREIGN KEY (`intern_profile_id`) REFERENCES `intern_profiles` (`id`) ON DELETE CASCADE
    ) CHARACTER SET=utf8mb4;

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `migration_id` = '20260815155810_InitialCreate') THEN

    CREATE TABLE `intern_documents` (
        `id` int NOT NULL AUTO_INCREMENT,
        `intern_profile_id` int NOT NULL,
        `document_type` varchar(40) CHARACTER SET utf8mb4 NOT NULL,
        `file_id` char(36) COLLATE ascii_general_ci NOT NULL,
        `version` int NOT NULL,
        `status` varchar(40) CHARACTER SET utf8mb4 NOT NULL,
        `remarks` varchar(500) CHARACTER SET utf8mb4 NULL,
        `uploaded_at_utc` datetime(6) NOT NULL,
        `reviewed_by_user_id` int NULL,
        `reviewed_at_utc` datetime(6) NULL,
        CONSTRAINT `pk_intern_documents` PRIMARY KEY (`id`),
        CONSTRAINT `fk_intern_documents_intern_profiles_intern_profile_id` FOREIGN KEY (`intern_profile_id`) REFERENCES `intern_profiles` (`id`) ON DELETE CASCADE
    ) CHARACTER SET=utf8mb4;

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `migration_id` = '20260815155810_InitialCreate') THEN

    CREATE TABLE `project_assignments` (
        `id` int NOT NULL AUTO_INCREMENT,
        `intern_profile_id` int NOT NULL,
        `assigned_by_user_id` int NOT NULL,
        `title` varchar(200) CHARACTER SET utf8mb4 NOT NULL,
        `description` varchar(2000) CHARACTER SET utf8mb4 NULL,
        `file_id` char(36) COLLATE ascii_general_ci NULL,
        `due_date` date NULL,
        `status` varchar(40) CHARACTER SET utf8mb4 NOT NULL,
        `assigned_at_utc` datetime(6) NOT NULL,
        CONSTRAINT `pk_project_assignments` PRIMARY KEY (`id`),
        CONSTRAINT `fk_project_assignments_intern_profiles_intern_profile_id` FOREIGN KEY (`intern_profile_id`) REFERENCES `intern_profiles` (`id`) ON DELETE CASCADE
    ) CHARACTER SET=utf8mb4;

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `migration_id` = '20260815155810_InitialCreate') THEN

    CREATE INDEX `ix_attendance_challenge_sessions_intern_profile_id_state_expire` ON `attendance_challenge_sessions` (`intern_profile_id`, `state`, `expires_at_utc`);

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `migration_id` = '20260815155810_InitialCreate') THEN

    CREATE UNIQUE INDEX `ix_attendance_challenge_sessions_nonce` ON `attendance_challenge_sessions` (`nonce`);

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `migration_id` = '20260815155810_InitialCreate') THEN

    CREATE INDEX `ix_attendance_challenge_sessions_state_expires_at_utc` ON `attendance_challenge_sessions` (`state`, `expires_at_utc`);

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `migration_id` = '20260815155810_InitialCreate') THEN

    CREATE UNIQUE INDEX `ix_attendance_days_intern_profile_id_work_date` ON `attendance_days` (`intern_profile_id`, `work_date`);

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `migration_id` = '20260815155810_InitialCreate') THEN

    CREATE INDEX `ix_attendance_days_work_date_status` ON `attendance_days` (`work_date`, `status`);

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `migration_id` = '20260815155810_InitialCreate') THEN

    CREATE INDEX `ix_attendance_events_intern_profile_id_occurred_at_utc` ON `attendance_events` (`intern_profile_id`, `occurred_at_utc`);

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `migration_id` = '20260815155810_InitialCreate') THEN

    CREATE INDEX `ix_attendance_media_phash` ON `attendance_media` (`phash`);

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `migration_id` = '20260815155810_InitialCreate') THEN

    CREATE INDEX `ix_attendance_media_retention_expires_at_utc_purged_at_utc` ON `attendance_media` (`retention_expires_at_utc`, `purged_at_utc`);

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `migration_id` = '20260815155810_InitialCreate') THEN

    CREATE INDEX `ix_attendance_overrides_intern_profile_id_date_pk` ON `attendance_overrides` (`intern_profile_id`, `date_pk`);

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `migration_id` = '20260815155810_InitialCreate') THEN

    CREATE INDEX `ix_attendance_verification_attempts_intern_profile_id_date_pk` ON `attendance_verification_attempts` (`intern_profile_id`, `date_pk`);

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `migration_id` = '20260815155810_InitialCreate') THEN

    CREATE INDEX `ix_attendance_verification_attempts_verdict_risk_score_created_` ON `attendance_verification_attempts` (`verdict`, `risk_score`, `created_at_utc`);

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `migration_id` = '20260815155810_InitialCreate') THEN

    CREATE INDEX `ix_audit_logs_actor_user_id_created_at_utc` ON `audit_logs` (`actor_user_id`, `created_at_utc`);

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `migration_id` = '20260815155810_InitialCreate') THEN

    CREATE INDEX `ix_audit_logs_entity_type_entity_id` ON `audit_logs` (`entity_type`, `entity_id`);

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `migration_id` = '20260815155810_InitialCreate') THEN

    CREATE UNIQUE INDEX `ix_certificates_certificate_number` ON `certificates` (`certificate_number`);

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `migration_id` = '20260815155810_InitialCreate') THEN

    CREATE UNIQUE INDEX `ix_certificates_intern_profile_id` ON `certificates` (`intern_profile_id`);

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `migration_id` = '20260815155810_InitialCreate') THEN

    CREATE UNIQUE INDEX `ix_departments_code` ON `departments` (`code`);

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `migration_id` = '20260815155810_InitialCreate') THEN

    CREATE UNIQUE INDEX `ix_departments_name` ON `departments` (`name`);

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `migration_id` = '20260815155810_InitialCreate') THEN

    CREATE UNIQUE INDEX `ix_device_bindings_intern_profile_id_device_id` ON `device_bindings` (`intern_profile_id`, `device_id`);

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `migration_id` = '20260815155810_InitialCreate') THEN

    CREATE INDEX `ix_email_outbox_messages_status_next_attempt_at_utc` ON `email_outbox_messages` (`status`, `next_attempt_at_utc`);

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `migration_id` = '20260815155810_InitialCreate') THEN

    CREATE INDEX `ix_face_templates_intern_profile_id_is_active` ON `face_templates` (`intern_profile_id`, `is_active`);

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `migration_id` = '20260815155810_InitialCreate') THEN

    CREATE UNIQUE INDEX `ix_face_templates_intern_profile_id_version` ON `face_templates` (`intern_profile_id`, `version`);

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `migration_id` = '20260815155810_InitialCreate') THEN

    CREATE UNIQUE INDEX `ix_github_submissions_intern_profile_id_version` ON `github_submissions` (`intern_profile_id`, `version`);

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `migration_id` = '20260815155810_InitialCreate') THEN

    CREATE INDEX `ix_holidays_date_department_id` ON `holidays` (`date`, `department_id`);

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `migration_id` = '20260815155810_InitialCreate') THEN

    CREATE UNIQUE INDEX `ix_id_cards_card_number` ON `id_cards` (`card_number`);

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `migration_id` = '20260815155810_InitialCreate') THEN

    CREATE UNIQUE INDEX `ix_id_cards_intern_profile_id` ON `id_cards` (`intern_profile_id`);

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `migration_id` = '20260815155810_InitialCreate') THEN

    CREATE UNIQUE INDEX `ix_intern_documents_intern_profile_id_document_type_version` ON `intern_documents` (`intern_profile_id`, `document_type`, `version`);

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `migration_id` = '20260815155810_InitialCreate') THEN

    CREATE UNIQUE INDEX `ix_intern_profiles_intern_code` ON `intern_profiles` (`intern_code`);

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `migration_id` = '20260815155810_InitialCreate') THEN

    CREATE INDEX `ix_intern_profiles_mentor_id` ON `intern_profiles` (`mentor_id`);

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `migration_id` = '20260815155810_InitialCreate') THEN

    CREATE UNIQUE INDEX `ix_intern_profiles_user_id` ON `intern_profiles` (`user_id`);

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `migration_id` = '20260815155810_InitialCreate') THEN

    CREATE INDEX `ix_job_runs_job_name_started_at_utc` ON `job_runs` (`job_name`, `started_at_utc`);

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `migration_id` = '20260815155810_InitialCreate') THEN

    CREATE INDEX `ix_notifications_recipient_user_id_is_read_created_at_utc` ON `notifications` (`recipient_user_id`, `is_read`, `created_at_utc`);

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `migration_id` = '20260815155810_InitialCreate') THEN

    CREATE INDEX `ix_project_assignments_intern_profile_id` ON `project_assignments` (`intern_profile_id`);

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `migration_id` = '20260815155810_InitialCreate') THEN

    CREATE UNIQUE INDEX `ix_refresh_tokens_token_hash` ON `refresh_tokens` (`token_hash`);

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `migration_id` = '20260815155810_InitialCreate') THEN

    CREATE INDEX `ix_refresh_tokens_user_id` ON `refresh_tokens` (`user_id`);

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `migration_id` = '20260815155810_InitialCreate') THEN

    CREATE INDEX `ix_stored_files_owner_user_id` ON `stored_files` (`owner_user_id`);

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `migration_id` = '20260815155810_InitialCreate') THEN

    CREATE UNIQUE INDEX `ix_users_cnic` ON `users` (`cnic`);

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `migration_id` = '20260815155810_InitialCreate') THEN

    CREATE INDEX `ix_users_department_id` ON `users` (`department_id`);

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `migration_id` = '20260815155810_InitialCreate') THEN

    CREATE UNIQUE INDEX `ix_users_email` ON `users` (`email`);

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `migration_id` = '20260815155810_InitialCreate') THEN

    CREATE INDEX `ix_users_role_department_id` ON `users` (`role`, `department_id`);

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

DROP PROCEDURE IF EXISTS MigrationsScript;
DELIMITER //
CREATE PROCEDURE MigrationsScript()
BEGIN
    IF NOT EXISTS(SELECT 1 FROM `__EFMigrationsHistory` WHERE `migration_id` = '20260815155810_InitialCreate') THEN

    INSERT INTO `__EFMigrationsHistory` (`migration_id`, `product_version`)
    VALUES ('20260815155810_InitialCreate', '8.0.8');

    END IF;
END //
DELIMITER ;
CALL MigrationsScript();
DROP PROCEDURE MigrationsScript;

COMMIT;

