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
