-- Extensions must be created before any table that uses CITEXT or trigram indexes.

CREATE EXTENSION IF NOT EXISTS citext;    -- case-insensitive text type (emails, scientific names, site names)
CREATE EXTENSION IF NOT EXISTS pg_trgm;   -- trigram indexes, used for fast fuzzy/substring search
