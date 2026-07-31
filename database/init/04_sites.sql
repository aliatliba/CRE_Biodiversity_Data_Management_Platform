-- =========================================================
-- SITES
-- =========================================================
CREATE TABLE sites (
    id          BIGSERIAL PRIMARY KEY,
    name        VARCHAR(255) NOT NULL,
    code        VARCHAR(50) UNIQUE,
    description TEXT,
    created_by  BIGINT NOT NULL REFERENCES users(id),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_sites_created_by ON sites(created_by);

-- Trigram index -> fast case-insensitive / partial-match search for the
-- searchable site dropdown (e.g. WHERE name ILIKE '%for%').
CREATE INDEX idx_sites_name_trgm ON sites USING gin (name gin_trgm_ops);

CREATE TRIGGER trg_sites_updated_at
    BEFORE UPDATE ON sites
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();
