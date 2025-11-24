// @generated automatically by Diesel CLI.

diesel::table! {
    oidc_tokens (issuer, subject) {
        issuer -> Text,
        subject -> Text,
        encrypted_refresh_token -> Bytea,
        expires_at -> Nullable<Timestamptz>,
        created_at -> Timestamptz,
        updated_at -> Timestamptz,
    }
}
