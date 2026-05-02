-- ==========================================================
-- FleetIQ  —  Backup Strategy
-- ==========================================================
-- This file creates the DATABASE-LEVEL infrastructure for
-- tracking backup events.  Physical backups are launched at
-- the OS / DBA level; this schema records when they ran and
-- whether they succeeded.
--
-- ── RECOMMENDED BACKUP COMMANDS (run in a shell, not psql) ─
--
-- 1. Logical full backup (pgAdmin-compatible custom format):
--      pg_dump -U postgres -d fleetiq -F c \
--              -f "/backups/fleetiq_$(date +%Y%m%d_%H%M%S).dump"
--
-- 2. Plain-SQL schema-only backup:
--      pg_dump -U postgres -d fleetiq -s \
--              -f "/backups/fleetiq_schema_$(date +%Y%m%d).sql"
--
-- 3. Plain-SQL data-only backup:
--      pg_dump -U postgres -d fleetiq -a \
--              -f "/backups/fleetiq_data_$(date +%Y%m%d).sql"
--
-- 4. Restore from custom-format dump:
--      pg_restore -U postgres -d fleetiq \
--                 "/backups/fleetiq_backup.dump"
--
-- ── POINT-IN-TIME RECOVERY (WAL archiving) ─────────────────
-- In postgresql.conf:
--   wal_level  = replica
--   archive_mode = on
--   archive_command = 'cp %p /wal_archive/%f'
--
-- Restore procedure:
--   1. pg_basebackup -U postgres -D /restore_dir -P -Xs -R
--   2. Set restore_command in postgresql.conf
--   3. Create recovery.signal in data dir, start Postgres
-- ===========================================================


-- Stores one row per backup event (logical or base-backup).
CREATE TABLE IF NOT EXISTS backup_log (
    backup_id    SERIAL      PRIMARY KEY,
    backup_type  TEXT        NOT NULL
                             CHECK (backup_type IN ('full', 'incremental', 'schema', 'data')),
    started_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    status       TEXT        NOT NULL DEFAULT 'in_progress'
                             CHECK (status IN ('in_progress', 'success', 'failed')),
    size_bytes   BIGINT,
    initiated_by TEXT        NOT NULL DEFAULT current_user,
    notes        TEXT
);


-- Call this BEFORE the pg_dump command to register a backup start.
-- Returns the new backup_id so you can pass it to complete_backup_log().
CREATE OR REPLACE FUNCTION begin_backup_log(
    p_type  TEXT,
    p_notes TEXT DEFAULT NULL
)
RETURNS INT
LANGUAGE plpgsql AS $$
DECLARE
    v_id INT;
BEGIN
    INSERT INTO backup_log (backup_type, notes)
    VALUES (p_type, p_notes)
    RETURNING backup_id INTO v_id;
    RETURN v_id;
END;
$$;


-- Call this AFTER pg_dump completes to record size and outcome.
CREATE OR REPLACE FUNCTION complete_backup_log(
    p_backup_id  INT,
    p_size_bytes BIGINT DEFAULT NULL,
    p_status     TEXT   DEFAULT 'success'
)
RETURNS VOID
LANGUAGE plpgsql AS $$
BEGIN
    UPDATE backup_log
    SET completed_at = NOW(),
        status       = p_status,
        size_bytes   = p_size_bytes
    WHERE backup_id = p_backup_id;
END;
$$;


-- View: last 30 backup events — for health-check queries in the admin dashboard.
CREATE OR REPLACE VIEW backup_health_view AS
SELECT
    backup_id,
    backup_type,
    status,
    started_at,
    completed_at,
    ROUND(
        EXTRACT(EPOCH FROM (completed_at - started_at))::NUMERIC,
    2)                                              AS duration_seconds,
    ROUND(size_bytes::NUMERIC / 1024 / 1024, 2)    AS size_mb,
    initiated_by,
    notes
FROM backup_log
ORDER BY started_at DESC
LIMIT 30;


-- ── Usage example (run after every pg_dump in your backup script) ──
-- DO $$
-- DECLARE v_id INT;
-- BEGIN
--     v_id := begin_backup_log('full', 'Nightly scheduled dump');
--     -- ... pg_dump runs here (outside psql) ...
--     PERFORM complete_backup_log(v_id, 104857600, 'success'); -- 100 MB
-- END;
-- $$;

-- Seed the log with an initial schema-backup marker.
DO $$
DECLARE v_id INT;
BEGIN
    v_id := begin_backup_log('schema', 'Initial schema backup marker — FleetIQ v1.0');
    PERFORM complete_backup_log(v_id, NULL, 'success');
END;
$$;
