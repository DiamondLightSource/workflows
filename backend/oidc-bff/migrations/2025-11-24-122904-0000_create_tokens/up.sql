CREATE TABLE oidc_tokens (
    issuer TEXT NOT NULL,
    subject TEXT NOT NULL,
    
    encrypted_refresh_token BYTEA NOT NULL,

    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    PRIMARY KEY (issuer, subject)
);
