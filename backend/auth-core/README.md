# auth-core

Shared Rust library providing OIDC authentication primitives for the Workflows auth services. Not deployed independently — consumed by `auth-daemon` and `auth-gateway` as a Cargo dependency.

## What it provides

- OIDC client initialisation and token exchange
- Refresh token storage encrypted with libsodium sealed-box in PostgreSQL
- Token injection and auto-refresh middleware for Axum services
- Database migrations for the `oidc_tokens` table

## Generate encryption keys

```sh
cargo run --bin keygen
```

Outputs Base64-encoded public and private keys to set in service config.

## Run database migrations

```sh
cd migration && cargo run
```

