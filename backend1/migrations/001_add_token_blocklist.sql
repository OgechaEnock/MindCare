-- MindCare Migration 001
-- Adds the JWT token blocklist table (used by Flask-JWT-Extended for
-- token revocation on logout). Non-destructive: uses IF NOT EXISTS,
-- preserves all existing data.

CREATE TABLE IF NOT EXISTS token_blocklist (
    id SERIAL PRIMARY KEY,
    jti VARCHAR(36) NOT NULL UNIQUE,
    token_type VARCHAR(20) NOT NULL,   -- 'access' | 'refresh'
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITHOUT TIME ZONE NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_token_blocklist_jti ON token_blocklist(jti);
CREATE INDEX IF NOT EXISTS idx_token_blocklist_expires ON token_blocklist(expires_at);