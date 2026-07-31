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
