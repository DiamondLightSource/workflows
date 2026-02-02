# Backend-For-Frontend (BFF) Architecture Analysis

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Architecture Overview](#architecture-overview)
3. [Component Deep Dive](#component-deep-dive)
   - [auth-common](#auth-common)
   - [oidc-bff](#oidc-bff)
   - [auth-daemon](#auth-daemon)
4. [BFF Compliance Assessment](#bff-compliance-assessment)
5. [Implementation Progress](#implementation-progress)
6. [Remaining Improvements](#remaining-improvements)
7. [Implementation Recommendations](#implementation-recommendations)
8. [References (Verified with Source Quotes)](#references-verified-with-source-quotes)
9. [Recommended Reading](#recommended-reading)
10. [Actionable Tasks / Tickets](#actionable-tasks--tickets)
11. [Summary](#summary)

---

## Executive Summary

This document analyzes the current authentication backend implementation against the **Backend-For-Frontend (BFF)** architectural pattern as defined by IETF best practices. The system consists of three core components:

| Component | Purpose |
|-----------|---------|
| `auth-common` | Shared library for token management, database operations, and HTTP utilities |
| `oidc-bff` | Browser-facing BFF that handles OAuth login flows and request proxying |
| `auth-daemon` | Workflow sidecar that injects tokens for server-to-server communication |

The implementation **successfully follows many BFF principles** and has undergone significant refactoring to address technical debt. Several critical issues have been resolved, but some areas still require attention for full security compliance.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              BROWSER                                        │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │  Frontend Application (JavaScript/React)                             │   │
│  │  - Never sees OAuth tokens                                           │   │
│  │  - Receives only session cookie                                      │   │
│  └────────────────────────────┬─────────────────────────────────────────┘   │
└───────────────────────────────┼─────────────────────────────────────────────┘
                                │ HTTP (Session Cookie)
                                ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           oidc-bff                                          │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │ Confidential OAuth Client                                              │ │
│  │ - Client ID + Secret                                                   │ │
│  │ - OIDC Discovery                                                       │ │
│  │ - Authorization Code + PKCE                                            │ │
│  ├────────────────────────────────────────────────────────────────────────┤ │
│  │ Session Management                                                     │ │
│  │ - tower_sessions (MemoryStore)                                         │ │
│  │ - CSRF protection (state parameter)                                    │ │
│  │ - Nonce validation                                                     │ │
│  ├────────────────────────────────────────────────────────────────────────┤ │
│  │ Token Management                                                       │ │
│  │ - Access tokens stored in session (server-side)                        │ │
│  │ - Refresh tokens encrypted → PostgreSQL                                │ │
│  │ - Automatic token refresh                                              │ │
│  ├────────────────────────────────────────────────────────────────────────┤ │
│  │ Request Proxy                                                          │ │
│  │ - Strips cookies                                                       │ │
│  │ - Injects Bearer token                                                 │ │
│  │ - Forwards to resource server                                          │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
                                │
                                │ Bearer Token
                                ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                       Resource Server (GraphQL)                             │
│               staging.workflows.diamond.ac.uk/graphql                       │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Workflow Authentication Flow

```
┌────────────────────────────────────────────────────────────────────────────┐
│                           WORKFLOW POD                                     │
│  ┌────────────────────────────────────────────────────────────────────-┐   │
│  │ Workflow Container                                                  │   │
│  │ - Makes HTTP requests to localhost                                  │   │
│  │ - No token awareness                                                │   │
│  └─────────────────────────────┬──────────────────────────────────────-┘   │
│                                │ HTTP (no auth)                            │
│                                ▼                                           │
│  ┌─────────────────────────────────────────────────────────────────-───┐   │
│  │ auth-daemon (Sidecar)                                               │   │
│  │ - Reads refresh token from PostgreSQL (encrypted)                   │   │
│  │ - Obtains access token via token refresh                            │   │
│  │ - Injects Bearer token into outgoing requests                       │   │
│  │ - Proxies to resource server                                        │   │
│  └─────────────────────────────┬─────────────────────────────────-─────┘   │
└────────────────────────────────┼──────────────────────────────────────-────┘
                                 │ Bearer Token
                                 ▼
┌────────────────────────────────────────────────────────────────────────────┐
│                        Resource Server (GraphQL)                           │
└────────────────────────────────────────────────────────────────────────────┘
```

---

## Component Deep Dive

### auth-common

**Purpose**: Shared library providing common authentication functionality to both `oidc-bff` and `auth-daemon`.

#### File Structure

```
auth-common/src/
├── lib.rs           # Module exports
├── config.rs        # Configuration loading utilities
├── database.rs      # Token CRUD operations with encryption
├── error.rs         # Shared error type (anyhow wrapper)
├── http_utils.rs    # Request cloning & header preparation
├── token.rs         # TokenData struct definition
└── entity/
    ├── mod.rs
    └── oidc_tokens.rs  # SeaORM entity for token storage
```

#### Key Data Structures

##### TokenData (`token.rs`)

```rust
pub struct TokenData {
    pub issuer: IssuerUrl,            // OAuth provider URL
    pub subject: SubjectIdentifier,    // User's unique ID
    pub access_token: Option<AccessToken>,  // Short-lived (optional)
    pub access_token_expires_at: DateTime<Utc>,
    pub refresh_token: RefreshToken,   // Long-lived
}
```

**Why `access_token` is `Option`?**
- In `oidc-bff`: Always `Some()` after successful authentication
- In `auth-daemon`: Initially `None` when loaded from database (only refresh token is stored); populated after first token refresh

##### Database Schema (`oidc_tokens.rs`)

```rust
pub struct Model {
    pub issuer: String,                    // OAuth provider
    pub subject: String,                   // PRIMARY KEY (user ID)
    pub encrypted_refresh_token: Vec<u8>,  // Sealed box encrypted
    pub expires_at: Option<DateTimeWithTimeZone>,
    pub created_at: DateTimeWithTimeZone,
    pub updated_at: DateTimeWithTimeZone,
}
```

**Key Design Decision**: Subject is the primary key, meaning one token per user per system. Conflict resolution uses `ON CONFLICT ... UPDATE`.

#### Encryption Strategy

```rust
// Write: Encrypt refresh token using libsodium sealed box
let encrypted = sodiumoxide::crypto::sealedbox::seal(
    token.refresh_token.secret().as_bytes(), 
    public_key
);

// Read: Decrypt using both public and secret keys
let decrypted = sodiumoxide::crypto::sealedbox::open(
    &ciphertext, 
    public_key, 
    secret_key
);
```

**Why Sealed Boxes?**
- Encrypts data such that only the holder of the private key can decrypt
- No authentication between writer and reader (by design)
- `oidc-bff` only needs public key (encrypt-only)
- `auth-daemon` needs both keys (decrypt to use tokens)

#### HTTP Utilities (`http_utils.rs`)

```rust
// Clone request for retry logic (token refresh mid-request)
pub async fn clone_request(req: Request) -> Result<(Request, Request)>

// Prepare headers for proxying
pub fn prepare_headers(req: &mut Request, token: &TokenData) {
    // Add: Authorization: Bearer <token>
    // Remove: Cookie header (backend uses Bearer, not cookies)
}
```

---

### oidc-bff

**Purpose**: Browser-facing Backend-For-Frontend service handling OAuth login and request proxying.

#### File Structure

```
oidc-bff/src/
├── main.rs                    # Server entry point & router setup
├── config.rs                  # BFF-specific configuration
├── state.rs                   # Shared application state (OIDC client, DB)
├── login.rs                   # OAuth login initiation
├── callback.rs                # OAuth callback handler
├── auth_session_data.rs       # Session data structures
├── inject_token_from_session.rs  # Proxy middleware
├── auth_proxy.rs              # Alternative proxy-only mode
├── admin_auth.rs              # Debug endpoint protection
├── database.rs                # Re-exports from auth-common
├── error.rs                   # Re-exports from auth-common
├── healthcheck.rs             # Kubernetes probes
├── counter.rs                 # Debug/test session handling
└── lib.rs                     # Re-exports for library use
```

#### OAuth Flow Implementation

##### 1. Login Initiation (`login.rs`)

```rust
pub async fn login(State(state), session: Session) -> Result<Redirect> {
    // Generate PKCE challenge (proof of possession)
    let (pkce_challenge, pkce_verifier) = PkceCodeChallenge::new_random_sha256();
    
    // Generate authorization URL with:
    // - CSRF token (state parameter)
    // - Nonce (ID token replay protection)
    // - PKCE challenge
    // - Scopes: openid, offline_access
    let (auth_url, csrf_token, nonce) = oidc_client
        .authorize_url(CoreAuthenticationFlow::AuthorizationCode, ...)
        .add_scope(Scope::new("openid"))
        .add_scope(Scope::new("offline_access"))  // Enables refresh tokens
        .set_pkce_challenge(pkce_challenge)
        .url();
    
    // Store verification data in session (NOT sent to browser)
    session.insert(LoginSessionData::SESSION_KEY, LoginSessionData {
        csrf_token,
        pcke_verifier,  // PKCE verifier stays server-side
        nonce,
    });
    
    // Redirect to authorization server
    Redirect::temporary(auth_url)
}
```

##### 2. Callback Handler (`callback.rs`)

```rust
pub async fn callback(State(state), Query(params), session: Session) -> Result<String> {
    // 1. Retrieve and remove login session data
    let auth_data: LoginSessionData = session.remove(SESSION_KEY).await?;
    
    // 2. Verify CSRF token (state parameter)
    if auth_data.csrf_token != CsrfToken::new(params.state) {
        return Err("invalid state");
    }
    
    // 3. Exchange authorization code for tokens
    let token_response = oidc_client
        .exchange_code(AuthorizationCode::new(params.code))
        .set_pkce_verifier(auth_data.pcke_verifier)  // Prove we initiated
        .request_async(&http_client)
        .await?;
    
    // 4. Verify ID token
    let id_token = token_response.id_token()?;
    let claims = id_token.claims(&id_token_verifier, &auth_data.nonce)?;
    
    // 5. Verify access token hash (prevents token substitution)
    if let Some(expected_hash) = claims.access_token_hash() {
        let actual_hash = AccessTokenHash::from_token(
            token_response.access_token(),
            id_token.signing_alg()?,
            id_token.signing_key(&id_token_verifier)?,
        )?;
        if actual_hash != *expected_hash {
            return Err("Invalid access token");
        }
    }
    
    // 6. Store tokens
    let token_data = TokenSessionData::from_token_response(&token_response, ...);
    write_token_to_database(&db, &token_data, &public_key).await?;  // Encrypted
    session.insert(TokenSessionData::SESSION_KEY, token_data).await?;  // For proxying
    
    Ok("Login successful")
}
```

##### 3. Request Proxy (`inject_token_from_session.rs`)

```rust
pub async fn inject_token_from_session(
    State(state),
    session: Session,
    req: Request,
    next: Next,
) -> Result<impl IntoResponse> {
    // 1. Load token from session
    let token: Option<TokenSessionData> = session.get(TOKEN_KEY).await?;
    
    if let Some(mut token) = token {
        // 2. Refresh if expired
        if token.access_token_is_expired() {
            token = refresh_token_and_update_session(&state, &token, &session).await?;
        }
        
        // 3. Clone request (for retry)
        let mut req = clone_request(req).await?;
        
        // 4. Inject Bearer token, strip cookies
        prepare_headers(&mut req.0, &token);
        
        // 5. Forward request
        let response = next.run(req.0).await;
        
        // 6. Retry on 401 (token may have been revoked server-side)
        if response.status() == StatusCode::UNAUTHORIZED {
            token = refresh_token_and_update_session(&state, &token, &session).await?;
            prepare_headers(&mut req.1, &token);
            return Ok(next.run(req.1).await);
        }
        
        Ok(response)
    } else {
        // No session - forward without auth
        Ok(next.run(req).await)
    }
}
```

#### Session Management

```rust
// main.rs - Router setup
let session_store = MemoryStore::default();  // In-memory sessions
let session_layer = SessionManagerLayer::new(session_store)
    .with_secure(false);  // ⚠️ ISSUE: Should be true in production!
```

**Session Data Stored**:
1. `LoginSessionData` - Temporary (during OAuth flow):
   - CSRF token
   - PKCE verifier  
   - Nonce

2. `TokenSessionData` - Persistent (after login):
   - Issuer URL
   - Subject ID
   - Access token (in memory)
   - Access token expiry
   - Refresh token

---

### auth-daemon

**Purpose**: Sidecar service for Kubernetes workflow pods that authenticates API requests on behalf of a specific user.

#### File Structure

```
auth-daemon/src/
├── main.rs          # CLI & server entry point
├── config.rs        # Daemon-specific configuration
├── state.rs         # RouterState with token cache
├── inject_token.rs  # Token injection middleware
├── database.rs      # Re-exports from auth-common
├── error.rs         # Re-exports from auth-common
└── healthcheck.rs   # Kubernetes probes
```

#### Key Differences from oidc-bff

| Aspect | oidc-bff | auth-daemon |
|--------|----------|-------------|
| Token Source | OAuth callback | Database lookup |
| Session | Browser cookies | None (stateless) |
| User Context | From session | CLI argument (`--subject`) |
| Encryption Keys | Public only | Public + Private |
| Purpose | Human users | Automated workflows |

#### Initialization Flow

```rust
// main.rs
#[tokio::main]
async fn main() {
    // 1. Parse subject from environment/CLI
    let subject = args.subject;  // WORKFLOWS_AUTH_DAEMON_SUBJECT
    
    // 2. Load config with encryption keys
    let config = Config::from_file(args.config)?;
    
    // 3. Initialize state (loads token from DB)
    let state = RouterState::new(config, &SubjectIdentifier::new(subject)).await?;
    
    // 4. Start proxy server
    let router = setup_router(state)?;
    serve(router, port).await?;
}
```

```rust
// state.rs - RouterState::new()
pub async fn new(config: Config, subject: &SubjectIdentifier) -> Result<Self> {
    // 1. Connect to database
    let db = Database::connect(&database_url).await?;
    
    // 2. Setup OIDC client for token refresh
    let oidc_client = CoreClient::from_provider_metadata(...);
    
    // 3. Load encryption keys
    let public_key = PublicKey::from_slice(&decode(&config.encryption_public_key)?)?;
    let private_key = SecretKey::from_slice(&decode(&config.encryption_private_key)?)?;
    
    // 4. Read and decrypt token from database
    let token = read_token_from_database(&db, subject, None, &public_key, &private_key).await?;
    // Note: token.access_token is None at this point
    
    Ok(Self {
        token: RwLock::new(Some(token)),
        oidc_client,
        ...
    })
}
```

#### Token Injection (`inject_token.rs`)

```rust
pub async fn inject_token(
    State(state),
    req: Request,
    next: Next,
) -> Result<impl IntoResponse> {
    let token = state.token.read().await.clone();
    
    if let Some(mut token) = token {
        // Refresh on startup or expiry
        if token.access_token_is_expired() {
            token = refresh_token_and_write_to_database(&state, &token).await?;
        }
        
        let mut req = clone_request(req).await?;
        prepare_headers(&mut req.0, &token);
        
        let response = next.run(req.0).await;
        let response_json = response_as_json(response).await?;
        
        // Retry on GraphQL errors (different from HTTP 401)
        if !is_good_response(&response_json) {
            token = refresh_token_and_write_to_database(&state, &token).await?;
            prepare_headers(&mut req.1, &token);
            return Ok(next.run(req.1).await);
        }
        
        Ok(Json(response_json).into_response())
    } else {
        Ok(next.run(req).await)
    }
}
```

---

## BFF Compliance Assessment

### Fully Implemented

| Principle | Implementation |
|-----------|----------------|
| **Confidential Client** | Client ID + Secret stored server-side in `AppState` |
| **Token Isolation** | Access/refresh tokens never sent to browser |
| **Authorization Code + PKCE** | Both implemented in `login.rs` |
| **CSRF Protection** | State parameter verified in `callback.rs` |
| **Nonce Validation** | ID token nonce checked in `callback.rs` |
| **Access Token Hash Verification** | Prevents token substitution attacks |
| **Cookie-Based Sessions** | `tower_sessions` handles session cookies |
| **Request Proxying** | `axum_reverse_proxy` with token injection |
| **Cookie Stripping** | `prepare_headers()` removes Cookie header |
| **Encrypted Token Storage** | Sealed boxes for database refresh tokens |

### Partially Implemented

| Principle | Current State | Issue |
|-----------|---------------|-------|
| **Session Security** | `with_secure(false)` | Cookies transmitted over HTTP |
| **Session Store** | `MemoryStore` | Lost on restart, not scalable |
| **Outbound Validation** | Hardcoded single URL | No allowlist validation |

### Missing

| Principle | Impact | Recommendation |
|-----------|--------|----------------|
| **CORS Configuration** | No explicit CORS on BFF | Add strict CORS layer |
| **Custom Header CSRF** | Relies only on state parameter | Add `X-Requested-With` check |
| **Session Expiry** | Commented out | Implement idle timeout |
| **Check Session Endpoint** | Missing | Add `/auth/session` endpoint |
| **Proper Logout Redirect** | Returns 200 OK | Redirect to application |
| **Refresh Token Expiry** | Hardcoded 30 days | Use `refresh_expires_in` |

---

## Implementation Progress

This section tracks the improvements identified in the original `suggestions.md` technical debt document and their current status.

### Completed Items

#### 1. Shared Crate Structure (P4 → Done)

The `auth-common` crate has been created and consolidates shared code:

```
backend/auth-common/src/
├── lib.rs           # Module exports
├── config.rs        # Configuration loading utilities  
├── database.rs      # Token CRUD with encryption
├── error.rs         # Shared error type
├── http_utils.rs    # Request cloning & header prep
├── token.rs         # TokenData struct
└── entity/
    └── oidc_tokens.rs
```

**What was extracted:**

| Code                        | From             | To                          |
|-----------------------------|------------------|-----------------------------|
| `Error` type                | both services    | `auth_common::error`        |
| `TokenData` struct          | both services    | `auth_common::token`        |
| `write_token_to_database()` | both services    | `auth_common::database`     |
| `read_token_from_database()`| auth-daemon      | `auth_common::database`     |
| `delete_token_from_database()`| oidc-bff      | `auth_common::database`     |
| `clone_request()`           | both services    | `auth_common::http_utils`   |
| `prepare_headers()`         | both services    | `auth_common::http_utils`   |
| SeaORM entity               | both services    | `auth_common::entity`       |

---

#### 2. Logout Function Fixed (P0 → Done)

**Before** (empty function):
```rust
async fn logout() {}
```

**After** (proper implementation in `oidc-bff/src/main.rs`):
```rust
async fn logout(
    State(state): State<Arc<AppState>>,
    session: Session,
) -> Result<impl IntoResponse> {
    // Get token data to find subject for database deletion
    let token_session_data: Option<TokenSessionData> =
        session.get(TokenSessionData::SESSION_KEY).await?;

    // Delete from database so workflows can't use the token
    if let Some(token_data) = token_session_data {
        database::delete_token_from_database(
            &state.database_connection,
            &token_data.subject,
        ).await?;
    }

    // Clear the session
    session.flush().await?;
    Ok(axum::http::StatusCode::OK)
}
```

---

#### 3. Error Information Leakage Fixed (P0 → Done)

**Before** (leaked internal details):
```rust
impl IntoResponse for Error {
    fn into_response(self) -> Response {
        (StatusCode::INTERNAL_SERVER_ERROR,
         format!("Something went wrong: {}", self.0))  // Exposed!
            .into_response()
    }
}
```

**After** (`auth-common/src/error.rs`):
```rust
impl IntoResponse for Error {
    fn into_response(self) -> Response {
        // Log for debugging (server-side only)
        tracing::error!(error = %self.0, "Request failed");
        
        // Generic message to client
        (StatusCode::INTERNAL_SERVER_ERROR,
         "An internal error occurred")
            .into_response()
    }
}
```

---

#### 4. Graceful Shutdown in auth-daemon (P1 → Partially Done)

Graceful shutdown is implemented via `with_graceful_shutdown()`:
```rust
axum::serve(listener, router.into_make_service())
    .with_graceful_shutdown(shutdown_signal())
    .await?;
```

**Note**: The `process::exit(0)` in `shutdown_signal()` still bypasses cleanup:
```rust
async fn shutdown_signal() {
    sigterm.recv().await;
    println!("Shutting down");
    process::exit(0);  // Still problematic!
}
```

---

#### 5. Unwraps Fixed in Shared Code (P1 → Done)

**Before** (in duplicated code):
```rust
HeaderValue::from_str(&value).unwrap()  // Could panic
```

**After** (`auth-common/src/http_utils.rs`):
```rust
if let Ok(header_value) = HeaderValue::from_str(&value) {
    req.headers_mut().insert(http::header::AUTHORIZATION, header_value);
} else {
    tracing::warn!("Failed to create Authorization header value");
}
```

**Note**: `oidc-bff/src/inject_token.rs` still has an unwrap at line 87 (this file appears to be a duplicate/older version not using `auth_common::http_utils`).

---

#### 6. Debug Endpoint Protection (P2 → Done)

Debug routes now protected with admin auth middleware:
```rust
#[cfg(debug_assertions)]
{
    router = router.route(
        "/debug",
        get(debug).layer(middleware::from_fn(admin_auth::require_admin_auth)),
    );
}
```

Admin auth requires `X-Admin-Token` header matching `WORKFLOWS_ADMIN_TOKEN` env var.

---

### Partially Completed

#### 7. Duplicate inject_token Files

There are **two** inject_token files in oidc-bff:
- `inject_token_from_session.rs` - Uses `auth_common::http_utils` ✅
- `inject_token.rs` - Has duplicated code, unwraps ❌

The `main.rs` uses `inject_token_from_session`, but `inject_token.rs` should be removed or consolidated.

---

### Not Yet Implemented

#### 8. Hardcoded URLs (P0 - Still Open)

**Locations still hardcoded:**
- `oidc-bff/src/main.rs:72` - Proxy URL
- `oidc-bff/src/login.rs:21` - Callback URL  
- `oidc-bff/src/callback.rs:46` - Callback URL

**Recommendation**: Add to `Config`:
```rust
pub struct Config {
    pub graph_url: String,      // For proxy
    pub callback_url: String,   // For OAuth redirects
    pub base_url: String,       // Application base URL
    // ... existing fields
}
```

---

#### 9. `process::exit(0)` in Shutdown (P0 - Still Open)

**Location:** `auth-daemon/src/main.rs:136-137`

```rust
async fn shutdown_signal() {
    sigterm.recv().await;
    println!("Shutting down");
    process::exit(0);  // Bypasses graceful shutdown
}
```

**Fix**: Remove `process::exit(0)` and let the function return naturally:
```rust
async fn shutdown_signal() {
    sigterm.recv().await;
    tracing::info!("Received SIGTERM, initiating graceful shutdown");
    // Let axum handle the rest
}
```

---

#### 10. No Logging in oidc-bff (P1 - Still Open)

`oidc-bff/src/main.rs` has no `tracing_subscriber` initialization.

**Fix**: Add to `main()`:
```rust
tracing_subscriber::fmt()
    .with_env_filter(EnvFilter::from_env("LOG_LEVEL"))
    .init();
```

---

#### 11. `println!` Instead of Logging (P1 - Still Open)

**Remaining occurrences** (auth-daemon/src/inject_token.rs):
```rust
println!("Injecting token");
println!("Access token is expired, refreshing");
println!("DEBUG response json: {:?}", response);
println!("Query failed, refreshing token and trying again");
println!("No token to inject");
```

Also in `auth-daemon/src/main.rs:136`:
```rust
println!("Shutting down");
```

**Fix**: Replace with tracing macros:
```rust
tracing::debug!("Injecting token");
tracing::debug!(response = ?response, "Response received");
tracing::info!("Shutting down gracefully");
```

---

#### 12. Missing Graceful Shutdown in oidc-bff (P1 - Still Open)

**Location:** `oidc-bff/src/main.rs:97-102`

```rust
async fn serve(router: Router, port: u16) -> Result<()> {
    let listener = tokio::net::TcpListener::bind(...).await?;
    axum::serve(listener, service).await?;  // No graceful shutdown
    Ok(())
}
```

**Fix**: Add shutdown signal handler like auth-daemon has.

---

#### 13. MemoryStore Documentation (P1 - Still Open)

The `MemoryStore` limitation is not documented in code.

**Fix**: Add warning comment:
```rust
// WARNING: MemoryStore is for development only!
// Sessions are lost on restart and not shared across replicas.
// For production, use tower-sessions-redis-store or tower-sessions-sqlx-store.
let session_store = MemoryStore::default();
```

---

#### 14. TLS Provider Location (P2 - Still Open)

TLS setup is in `setup_router()` in auth-daemon, which could be called multiple times in tests.

**Recommendation**: Move to `main()` before router setup.

---

#### 15. Inconsistent Health Endpoints (P2 - Still Open)

- `oidc-bff`: `/healthcheck`
- `auth-daemon`: `/healthz`

**Recommendation**: Standardize on `/healthz` (Kubernetes convention).

---

#### 16. Refresh Token Expiry TODO (P2 - Still Open)

**Location:** `auth-common/src/database.rs`

```rust
// TODO: offline_access tokens will expire if not used within 30 days.
// Keycloak returns the actual expiration date in "refresh_expires_in"
let refresh_token_expires_at = Utc::now() + Duration::days(30);
```

**Fix**: Parse `refresh_expires_in` from token response.

---

#### 17. Debug Routes Always Exposed (P3 - Still Open)

The `/read` and `/write` counter routes are always exposed, not just in debug builds:
```rust
.route("/read", get(counter::counter_read))
.route("/write", get(counter::counter_write))
```

**Fix**: Move behind `#[cfg(debug_assertions)]` or remove entirely.

---

## Remaining Improvements

### Session Security (CRITICAL)

**Current Code** (`main.rs`):
```rust
let session_layer = SessionManagerLayer::new(session_store)
    .with_secure(false);  // INSECURE
```

**Problem**: Session cookies sent over HTTP, vulnerable to MITM attacks.

**Fix**:
```rust
let session_layer = SessionManagerLayer::new(session_store)
    .with_secure(true)                    // HTTPS only
    .with_same_site(SameSite::Strict)     // CSRF protection
    .with_http_only(true)                 // No JS access
    .with_expiry(Expiry::OnInactivity(Duration::hours(1)));
```

---

### Session Store Scalability

**Current**: `MemoryStore::default()`

**Problems**:
- Sessions lost on pod restart
- Cannot scale horizontally
- Memory exhaustion risk

**Options**:

| Store | Pros | Cons |
|-------|------|------|
| Redis | Fast, shared state | Extra infrastructure |
| PostgreSQL | Reuses existing DB | Slower |
| Signed cookies | Stateless, scalable | Limited size |

---

### Missing Session Check Endpoint

**BFF Best Practice**:
```
Browser → /auth/session → { authenticated: true/false, user: {...} }
         → If false → /auth/login
```

**Add endpoint**:
```rust
#[derive(Serialize)]
pub struct SessionStatus {
    pub authenticated: bool,
    pub subject: Option<String>,
    pub email: Option<String>,
}

pub async fn check_session(session: Session) -> Json<SessionStatus> {
    let token: Option<TokenSessionData> = session.get(TOKEN_KEY).await.ok().flatten();
    Json(SessionStatus {
        authenticated: token.is_some(),
        subject: token.as_ref().map(|t| t.subject.to_string()),
        email: None,
    })
}
```

---

### CSRF Protection Enhancement

**Current**: Only OAuth state parameter validation

**Add custom header check** for non-OAuth routes:
```rust
pub async fn require_same_origin(req: Request, next: Next) -> Response {
    if req.method() != Method::GET {
        if !req.headers().contains_key("X-Requested-With") {
            return StatusCode::FORBIDDEN.into_response();
        }
    }
    next.run(req).await
}
```

---

## Implementation Recommendations

### Priority 1 (Security Critical)

| Item | Status | Action |
|------|--------|--------|
| Fix `process::exit(0)` | ❌ | Remove from shutdown handler |
| Move hardcoded URLs to config | ❌ | Add `graph_url`, `callback_url` to Config |
| Enable secure session cookies | ❌ | Set `with_secure(true)` in production |
| Implement session expiry | ❌ | Add idle/absolute timeouts |

### Priority 2 (Production Readiness)

| Item | Status | Action |
|------|--------|--------|
| Add tracing to oidc-bff | ❌ | Initialize `tracing_subscriber` |
| Replace `println!` with tracing | ❌ | Update auth-daemon logging |
| Add graceful shutdown to oidc-bff | ❌ | Add `with_graceful_shutdown()` |
| Document MemoryStore limitation | ❌ | Add warning comment |
| Add session check endpoint | ❌ | Create `/auth/session` route |

### Priority 3 (Code Quality)

| Item | Status | Action |
|------|--------|--------|
| Remove duplicate inject_token.rs | ❌ | Delete `oidc-bff/src/inject_token.rs` |
| Standardize health endpoints | ❌ | Change to `/healthz` |
| Move TLS setup to main() | ❌ | Refactor auth-daemon |
| Fix refresh token expiry | ❌ | Parse `refresh_expires_in` |
| Remove debug counter routes | ❌ | Gate behind feature flag |

### Priority 4 (Already Done)

| Item | Status |
|------|--------|
| Create shared crate | ✅ `auth-common` |
| Fix empty logout function | ✅ With DB cleanup |
| Fix error information leakage | ✅ Generic messages |
| Fix unwraps in shared code | ✅ `http_utils.rs` |
| Protect debug endpoint | ✅ Admin auth middleware |

---

## Appendix: Configuration Example

```yaml
# config.yaml (production)
client_id: "workflows-frontend"
client_secret: "${OIDC_CLIENT_SECRET}"
oidc_provider_url: "https://auth.diamond.ac.uk/realms/master"
port: 8080

# NEW: URLs that should be configurable
graph_url: "https://workflows.diamond.ac.uk/graphql"
callback_url: "https://workflows.diamond.ac.uk/auth/callback"
base_url: "https://workflows.diamond.ac.uk"

# Session (when implemented)
session_secure: true
session_idle_timeout_seconds: 3600
session_max_lifetime_seconds: 28800

# Database
postgres_hostname: "${DB_HOST}"
postgres_port: 5432
postgres_database: "auth_service"
postgres_user: "${DB_USER}"
postgres_password: "${DB_PASSWORD}"

# Encryption
encryption_public_key: "${ENCRYPTION_PUBLIC_KEY}"
encryption_private_key: ""  # Not needed for BFF (only auth-daemon)
```

---

## References

This section contains verified references with direct quotes from authoritative specifications.

### Standards & Specifications

#### 1. OpenID Connect Core 1.0
**Source**: https://openid.net/specs/openid-connect-core-1_0.html

**Authorization Code Flow (Section 3.1)**:
> "The Authorization Code Flow returns an Authorization Code to the Client, which can then exchange it for an ID Token and an Access Token directly. This provides the benefit of not exposing any tokens to the User Agent and possibly exposing them to others with access to the User Agent."

**ID Token Validation Requirements (Section 3.1.3.7)**:
> The Client MUST validate the ID Token in the Token Response in the following manner:
> 1. If the ID Token is encrypted, decrypt it...
> 2. The Issuer Identifier for the OpenID Provider (which is typically obtained during Discovery) MUST exactly match the value of the iss (issuer) Claim.
> 3. The Client MUST validate that the aud (audience) Claim contains its client_id value...
> 4. If the ID Token contains multiple audiences, the Client SHOULD verify that an azp Claim is present.
> 5. The current time MUST be before the time represented by the exp Claim.

**Nonce Requirement (Section 3.1.3.7)**:
> "The value of the nonce Claim MUST be checked to verify that it is the same value as the one that was sent in the Authentication Request. The Client SHOULD check the nonce value for replay attacks."

**Access Token Hash Validation (Section 3.1.3.8)**:
> "If the ID Token contains the at_hash Claim, the Client MAY use it to verify that the issued Access Token is the correct one... Hash the octets of the ASCII representation of the access_token with the hash algorithm specified... Take the left-most half of the hash and base64url-encode it."

**Token Lifetimes (Section 16.18)**:
> "Access Tokens might not be revocable by the Authorization Server. Access Token lifetimes SHOULD therefore be kept to single use or very short lifetimes."

**TLS Requirements (Section 3.1.2 and 16.17)**:
> "Communication with the Authorization Endpoint MUST utilize TLS. See Section 16.17 (TLS Requirements) for more information on using TLS."

---

#### 2. RFC 7636 - Proof Key for Code Exchange (PKCE)
**Source**: https://datatracker.ietf.org/doc/html/rfc7636

**Abstract**:
> "OAuth 2.0 public clients utilizing the Authorization Code Grant are susceptible to the authorization code interception attack. This specification describes the attack as well as a technique to mitigate against the threat through the use of Proof Key for Code Exchange (PKCE, pronounced 'pixy')."

**Attack Description (Section 1)**:
> "In this attack, the attacker intercepts the authorization code returned from the authorization endpoint within a communication path not protected by Transport Layer Security (TLS), such as inter-application communication within the client's operating system. Once the attacker has gained access to the authorization code, it can use it to obtain the access token."

**Mitigation (Section 1)**:
> "To mitigate this attack, this extension utilizes a dynamically created cryptographically random key called 'code verifier'. A unique code verifier is created for every authorization request, and its transformed value, called 'code challenge', is sent to the authorization server to obtain the authorization code."

**Code Verifier Requirements (Section 4.1)**:
> "code_verifier = high-entropy cryptographic random STRING using the unreserved characters [A-Z] / [a-z] / [0-9] / '-' / '.' / '_' / '~' from Section 2.3 of [RFC3986], with a minimum length of 43 characters and a maximum length of 128 characters."

**S256 Method (Section 4.2)**:
> "code_challenge = BASE64URL-ENCODE(SHA256(ASCII(code_verifier)))"
> "If the client is capable of using 'S256', it MUST use 'S256', as 'S256' is Mandatory To Implement (MTI) on the server."

**Entropy Requirements (Section 7.1)**:
> "The security model relies on the fact that the code verifier is not learned or guessed by the attacker. It is vitally important to adhere to this principle... The client SHOULD create a 'code_verifier' with a minimum of 256 bits of entropy."

---

#### 3. OAuth 2.0 for Browser-Based Applications (IETF Draft)
**Source**: https://datatracker.ietf.org/doc/html/draft-ietf-oauth-browser-based-apps

**Note**: This specification is currently an IETF draft and defines the BFF (Backend-For-Frontend) pattern for browser applications. Key recommendations include (as described in Section 6.1):

- **Backend-For-Frontend Pattern**: The BFF acts as a confidential OAuth client on behalf of the browser
- **Token Storage**: Access tokens and refresh tokens are kept on the backend, never exposed to the browser
- **Session Cookies**: The browser should receive only an HTTP-only, Secure session cookie, per the draft's recommendations
- **Request Proxying**: All authenticated API requests flow through the BFF

For complete details on the BFF architecture pattern and its security considerations, see Section 6.1 of the specification.

---

#### 4. RFC 6749 - OAuth 2.0 Authorization Framework
**Source**: https://datatracker.ietf.org/doc/html/rfc6749

**Authorization Code Grant (Referenced by RFC 7636)**:
- Defines the foundational OAuth 2.0 flows
- Section 4.1 specifies the Authorization Code Grant flow
- Section 4.1.1 describes Authorization Request parameters
- Section 4.1.3 describes Access Token Request parameters

See RFC 6749 Section 4.1 for the normative definition of the Authorization Code Grant flow.

---

### Framework Documentation

| Framework            | Documentation URL                                               | Purpose in Codebase                                   |
|----------------------|-----------------------------------------------------------------|-------------------------------------------------------|
| **Axum**             | https://docs.rs/axum/latest/axum/                               | Web framework for HTTP routing and middleware         |
| **Tower Sessions**   | https://docs.rs/tower-sessions/latest/tower_sessions/           | Session management with cookie backend                |
| **OpenIDConnect Rust** | https://docs.rs/openidconnect/latest/openidconnect/          | OIDC client implementation                            |
| **SeaORM**           | https://www.sea-ql.org/SeaORM/                                  | Async ORM for PostgreSQL token storage                |
| **sodiumoxide**      | https://docs.rs/sodiumoxide/latest/sodiumoxide/                 | libsodium bindings for sealed box encryption          |

---

### Security Best Practices

#### OWASP Session Management Cheat Sheet
**Source**: https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html

Key recommendations relevant to this implementation:
- Use secure, HTTP-only cookies for session identifiers
- Implement session expiration (idle and absolute timeouts)
- Regenerate session IDs after authentication
- Store minimal data in sessions

#### OWASP CSRF Prevention Cheat Sheet
**Source**: https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html

Key recommendations:
- Use SameSite cookie attribute (Strict or Lax)
- Implement synchronizer token pattern or double-submit cookies
- Verify Origin/Referer headers for sensitive operations


## Recommended Reading

### For Understanding the Architecture
1. Read the [Architecture Overview](#architecture-overview) section and diagrams
2. Review the [Component Deep Dive](#component-deep-dive) for implementation details
3. Check the [BFF Compliance Assessment](#bff-compliance-assessment) for security posture

### For Implementation Work
1. Read **RFC 7636 (PKCE)** - Essential for understanding the code verifier/challenge flow in `login.rs`
2. Read **OpenID Connect Core 1.0 Section 3.1** - Explains the validation logic in `callback.rs`
3. Review the [Implementation Progress](#implementation-progress) section for completed vs remaining work

### Essential Specification Sections

| Topic | Specification | Section |
|-------|---------------|---------|
| Authorization Code Flow | OpenID Connect Core 1.0 | Section 3.1 |
| ID Token Claims | OpenID Connect Core 1.0 | Section 2 |
| ID Token Validation | OpenID Connect Core 1.0 | Section 3.1.3.7 |
| PKCE Protocol | RFC 7636 | Section 4 |
| Code Challenge Methods | RFC 7636 | Section 4.2 |
| Security Considerations | RFC 7636 | Section 7 |

---

## Future Tickets

This section breaks down the remaining improvements into small, manageable tasks.

### Ticket Category: Security Critical (P0)

#### TICKET-001: Remove process::exit(0) from Shutdown Handler
**File**: `backend/auth-daemon/src/main.rs:136-137`
**Description**: The `process::exit(0)` bypasses graceful shutdown, preventing cleanup.
**Acceptance Criteria**:
- [ ] Remove `process::exit(0)` from `shutdown_signal()` function
- [ ] Replace `println!("Shutting down")` with `tracing::info!("Received SIGTERM, initiating graceful shutdown")`
- [ ] Verify graceful shutdown completes via integration test
**Effort**: Small (< 30 mins)

---

#### TICKET-002: Move Hardcoded URLs to Configuration
**Files**: 
- `backend/oidc-bff/src/main.rs:72` (proxy URL)
- `backend/oidc-bff/src/login.rs:21` (callback URL)
- `backend/oidc-bff/src/callback.rs:46` (callback URL)
**Description**: URLs are hardcoded to staging environment.
**Acceptance Criteria**:
- [ ] Add `graph_url`, `callback_url`, `base_url` to `Config` struct
- [ ] Update `login.rs` to use config callback URL
- [ ] Update `callback.rs` to use config callback URL  
- [ ] Update `main.rs` to use config graph URL
- [ ] Update `config.yaml` with new fields
- [ ] Document new config options in README
**Effort**: Medium (1-2 hours)

---

#### TICKET-003: Enable Secure Session Cookie Flags
**File**: `backend/oidc-bff/src/main.rs` (SessionManagerLayer)
**Description**: Session cookies are currently sent over HTTP (`with_secure(false)`).
**Acceptance Criteria**:
- [ ] Set `with_secure(true)` for production
- [ ] Add `with_same_site(SameSite::Strict)`
- [ ] Add `with_http_only(true)`
- [ ] Make secure flag configurable via environment variable
- [ ] Add warning log if secure=false
**Effort**: Small (< 30 mins)

---

#### TICKET-004: Implement Session Expiry
**File**: `backend/oidc-bff/src/main.rs`
**Description**: Session has no expiry, allowing indefinite session lifetimes.
**Acceptance Criteria**:
- [ ] Add `session_idle_timeout` to Config
- [ ] Add `session_max_lifetime` to Config
- [ ] Apply `with_expiry(Expiry::OnInactivity(...))` to SessionManagerLayer
- [ ] Document session timeout behavior
**Effort**: Small (30 mins)

---

### Ticket Category: Production Readiness (P1)

#### TICKET-005: Initialize Tracing in oidc-bff
**File**: `backend/oidc-bff/src/main.rs`
**Description**: No logging infrastructure is initialized.
**Acceptance Criteria**:
- [ ] Add `tracing` and `tracing-subscriber` dependencies to Cargo.toml
- [ ] Initialize `tracing_subscriber` with `EnvFilter` in main()
- [ ] Add structured logging for key operations
- [ ] Verify logs appear when running locally
**Effort**: Small (< 30 mins)

---

#### TICKET-006: Replace println! with Tracing in auth-daemon
**Files**: 
- `backend/auth-daemon/src/inject_token.rs` (5 occurrences)
- `backend/auth-daemon/src/main.rs:136` (1 occurrence)
**Description**: Debug output uses `println!` instead of structured logging.
**Acceptance Criteria**:
- [ ] Replace all `println!` with appropriate `tracing::*` macros
- [ ] Use `tracing::debug!` for normal flow messages
- [ ] Use `tracing::info!` for significant events (shutdown)
- [ ] Use structured fields (e.g., `tracing::debug!(response = ?response)`)
**Effort**: Small (< 30 mins)

---

#### TICKET-007: Add Graceful Shutdown to oidc-bff
**File**: `backend/oidc-bff/src/main.rs:97-102`
**Description**: Server has no graceful shutdown handler.
**Acceptance Criteria**:
- [ ] Add `shutdown_signal()` async function
- [ ] Apply `with_graceful_shutdown()` to axum::serve
- [ ] Handle SIGTERM and SIGINT signals
- [ ] Verify in-flight requests complete before shutdown
**Effort**: Small (30 mins)

---

#### TICKET-008: Add Session Check Endpoint
**File**: `backend/oidc-bff/src/` (new file: `session.rs`)
**Description**: No endpoint to check session status.
**Acceptance Criteria**:
- [ ] Create `SessionStatus` response struct
- [ ] Implement `check_session()` handler
- [ ] Add `/auth/session` route to router
- [ ] Return `{ authenticated: bool, subject?: string }`
- [ ] Add API documentation
**Effort**: Medium (1 hour)

---

#### TICKET-009: Document MemoryStore Limitation
**File**: `backend/oidc-bff/src/main.rs`
**Description**: MemoryStore limitations not documented.
**Acceptance Criteria**:
- [ ] Add warning comment above MemoryStore initialization
- [ ] Document alternatives (Redis, PostgreSQL)
- [ ] Add note in README about production session store requirements
**Effort**: Small (< 15 mins)

---

### Ticket Category: Code Quality (P2)

#### TICKET-010: Remove Duplicate inject_token.rs
**Files**: 
- `backend/oidc-bff/src/inject_token.rs` (to be removed)
- `backend/oidc-bff/src/inject_token_from_session.rs` (keep)
**Description**: Two inject_token files exist, causing confusion.
**Acceptance Criteria**:
- [ ] Verify `main.rs` uses `inject_token_from_session`
- [ ] Remove `inject_token.rs`
- [ ] Update any imports that may reference it
- [ ] Run tests to ensure nothing breaks
**Effort**: Small (< 15 mins)

---

#### TICKET-011: Standardize Health Endpoints
**Files**: 
- `backend/oidc-bff/src/main.rs` (`/healthcheck`)
- `backend/auth-daemon/src/main.rs` (`/healthz`)
**Description**: Inconsistent health endpoint naming.
**Acceptance Criteria**:
- [ ] Change oidc-bff to use `/healthz`
- [ ] Update Kubernetes manifests if needed
- [ ] Document standard endpoint in README
**Effort**: Small (< 30 mins)

---

#### TICKET-012: Parse Refresh Token Expiry
**File**: `backend/auth-common/src/database.rs`
**Description**: Refresh token expiry is hardcoded to 30 days.
**Acceptance Criteria**:
- [ ] Update `write_token_to_database()` to accept expiry parameter
- [ ] Parse `refresh_expires_in` from token response in callback
- [ ] Use actual expiry instead of hardcoded 30 days
- [ ] Add fallback to 30 days if not provided
**Effort**: Medium (1 hour)

---

#### TICKET-013: Gate Debug Routes Behind Feature Flag
**File**: `backend/oidc-bff/src/main.rs`
**Description**: `/read` and `/write` counter routes exposed in production.
**Acceptance Criteria**:
- [ ] Move counter routes behind `#[cfg(debug_assertions)]`
- [ ] Or add feature flag in Cargo.toml
- [ ] Verify routes not accessible in release build
**Effort**: Small (< 15 mins)

---

#### TICKET-014: Move TLS Provider Setup
**File**: `backend/auth-daemon/src/main.rs`
**Description**: TLS setup in `setup_router()` may be called multiple times in tests.
**Acceptance Criteria**:
- [ ] Move `rustls::crypto::ring::default_provider().install_default()` to main()
- [ ] Ensure it's only called once
- [ ] Add fallback handling if already installed
**Effort**: Small (< 30 mins)

---

### Task Summary

| Priority | Tickets |
|----------|---------|
| P0 (Security Critical) | TICKET-001 to TICKET-004 |
| P1 (Production Readiness) | TICKET-005 to TICKET-009 |
| P2 (Code Quality) | TICKET-010 to TICKET-014 |

---

## Summary

The current implementation has made **significant progress** since the initial technical debt assessment:

### Completed
- Shared `auth-common` crate extracted
- Logout function properly implemented with database cleanup
- Error messages no longer leak internal details
- Debug endpoints protected with admin auth
- Unwraps fixed in shared HTTP utilities

### Remaining Work
1. **Security Critical**: `process::exit(0)`, hardcoded URLs, session cookie flags
2. **Production Readiness**: Logging, graceful shutdown in oidc-bff, session store
3. **Code Quality**: Remove duplicate files, standardize endpoints

---

*Document Version: 1.1*
*Last Updated: 30/01/2026
