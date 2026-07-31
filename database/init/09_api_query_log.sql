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
