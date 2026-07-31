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
