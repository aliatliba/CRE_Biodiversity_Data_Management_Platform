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
