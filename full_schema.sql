-- Extensions must be created before any table that uses CITEXT or trigram indexes.

CREATE EXTENSION IF NOT EXISTS citext;    -- case-insensitive text type (emails, scientific names, site names)
CREATE EXTENSION IF NOT EXISTS pg_trgm;   -- trigram indexes, used for fast fuzzy/substring search
-- Generic trigger function: automatically bumps updated_at on every UPDATE.
-- Attached to any table that has an updated_at column.

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
-- =========================================================
-- ROLES
-- =========================================================
CREATE TABLE roles (
    id          SMALLSERIAL PRIMARY KEY,
    name        VARCHAR(50) NOT NULL UNIQUE,
    description TEXT
);

INSERT INTO roles (name, description) VALUES
    ('admin', 'Full access: manage users, sites, and all species data'),
    ('researcher', 'Can search species, review external data, and validate records');

-- =========================================================
-- USERS
-- =========================================================
CREATE TABLE users (
    id               BIGSERIAL PRIMARY KEY,
    email            CITEXT NOT NULL UNIQUE,
    hashed_password  VARCHAR(255) NOT NULL,
    full_name        VARCHAR(150) NOT NULL,
    role_id          SMALLINT NOT NULL REFERENCES roles(id),
    is_active        BOOLEAN NOT NULL DEFAULT true,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_users_role_id ON users(role_id);

CREATE TRIGGER trg_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();

-- NOTE: no admin user is inserted here on purpose — passwords must be
-- bcrypt/argon2 hashed by the application, never written as plain SQL.
-- Create the first admin via a one-off script/endpoint after the app is running.
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
-- =========================================================
-- SPECIES  (canonical, one row per scientific name)
-- =========================================================
CREATE TABLE species (
    id                  BIGSERIAL PRIMARY KEY,
    scientific_name     CITEXT NOT NULL UNIQUE,

    -- Taxonomy (nullable: "do not invent missing taxonomy")
    kingdom             VARCHAR(100),
    class_name          VARCHAR(100),
    order_name          VARCHAR(100),
    family              VARCHAR(100),
    genus               VARCHAR(100),
    species_epithet     VARCHAR(100),
    common_name         VARCHAR(255),
    raw_taxonomy_extra  JSONB,   -- extra/non-standard ranks not covered by fixed columns above

    -- Field-level provenance: which external source populated each field
    -- e.g. {"kingdom": {"source": "gbif", "reference": "2481838", "retrieved_at": "2026-07-01T10:00:00Z"}}
    field_sources       JSONB,

    -- Conservation status
    iucn_status         VARCHAR(50),
    iucn_trend          VARCHAR(50),
    national_status     VARCHAR(20) NOT NULL DEFAULT 'Non Protected'
                            CHECK (national_status IN ('Protected', 'Non Protected')),

    -- Ecological traits (from the original spreadsheet columns)
    guild               VARCHAR(255),
    ecosystem_service   TEXT,
    habitat             TEXT,
    typology            VARCHAR(255),
    endemism            VARCHAR(255),
    potential_threats   TEXT,
    reference           TEXT,

    -- Workflow / audit
    status              VARCHAR(20) NOT NULL DEFAULT 'draft'
                            CHECK (status IN ('draft', 'validated')),
    created_by          BIGINT NOT NULL REFERENCES users(id),
    validated_by        BIGINT REFERENCES users(id),
    validated_at        TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_species_family_genus ON species(family, genus);
CREATE INDEX idx_species_status ON species(status);
CREATE INDEX idx_species_created_by ON species(created_by);
CREATE INDEX idx_species_validated_by ON species(validated_by);

CREATE TRIGGER trg_species_updated_at
    BEFORE UPDATE ON species
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();
-- =========================================================
-- SITE_SPECIES  (many-to-many: which species recorded at which site)
-- =========================================================
CREATE TABLE site_species (
    id           BIGSERIAL PRIMARY KEY,
    site_id      BIGINT NOT NULL REFERENCES sites(id) ON DELETE RESTRICT,
    species_id   BIGINT NOT NULL REFERENCES species(id) ON DELETE RESTRICT,
    recorded_by  BIGINT NOT NULL REFERENCES users(id),
    notes        TEXT,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT uq_site_species UNIQUE (site_id, species_id)
);

-- uq_site_species already gives us a fast lookup on site_id (leftmost column),
-- so we only need an extra index for species_id lookups ("which sites is X at").
CREATE INDEX idx_site_species_species_id ON site_species(species_id);
CREATE INDEX idx_site_species_recorded_by ON site_species(recorded_by);
-- =========================================================
-- SPECIES_VALIDATION_HISTORY  (append-only audit trail)
-- =========================================================
CREATE TABLE species_validation_history (
    id              BIGSERIAL PRIMARY KEY,
    species_id      BIGINT NOT NULL REFERENCES species(id) ON DELETE CASCADE,
    action          VARCHAR(20) NOT NULL CHECK (action IN ('created', 'updated')),
    changed_fields  JSONB NOT NULL,   -- {"field": {"old": ..., "new": ...}}
    validated_by    BIGINT NOT NULL REFERENCES users(id),
    validated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_validation_history_species_id ON species_validation_history(species_id);
CREATE INDEX idx_validation_history_validated_at ON species_validation_history(validated_at);
-- =========================================================
-- PROTECTED_SPECIES_LIST  (org's own reference list -> national_status)
-- =========================================================
CREATE TABLE protected_species_list (
    id                BIGSERIAL PRIMARY KEY,
    scientific_name   CITEXT NOT NULL UNIQUE,
    source_reference  TEXT,
    added_by          BIGINT NOT NULL REFERENCES users(id),
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- =========================================================
-- API_QUERY_LOG  (optional but recommended — debugging/traceability)
-- =========================================================
CREATE TABLE api_query_log (
    id                  BIGSERIAL PRIMARY KEY,
    species_id          BIGINT REFERENCES species(id) ON DELETE SET NULL,
    provider            VARCHAR(50) NOT NULL,
    query_term          VARCHAR(255) NOT NULL,
    status              VARCHAR(20) NOT NULL CHECK (status IN ('success', 'error', 'not_found')),
    response_snapshot   JSONB,
    requested_by        BIGINT NOT NULL REFERENCES users(id),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_api_query_log_provider_created ON api_query_log(provider, created_at);
CREATE INDEX idx_api_query_log_species_id ON api_query_log(species_id);
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
