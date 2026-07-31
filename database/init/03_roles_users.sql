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
