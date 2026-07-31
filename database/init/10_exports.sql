-- =========================================================
-- EXPORTS
-- =========================================================
CREATE TABLE exports (
    id            BIGSERIAL PRIMARY KEY,
    requested_by  BIGINT NOT NULL REFERENCES users(id),
    format        VARCHAR(10) NOT NULL CHECK (format IN ('csv', 'xlsx')),
    filters       JSONB,
    status        VARCHAR(20) NOT NULL DEFAULT 'pending'
                      CHECK (status IN ('pending', 'processing', 'done', 'failed')),
    file_path     TEXT,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at  TIMESTAMPTZ
);

CREATE INDEX idx_exports_requested_by ON exports(requested_by);
CREATE INDEX idx_exports_status ON exports(status);
