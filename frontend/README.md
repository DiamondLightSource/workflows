# Setting up Dev Environment

1. pnpm install in frontend folder
2. Add GraphQL schema workflows.graphql in frontend/relay-workflows-lib
3. pnpm relay in frontend/relay-workflows-lib
   - this is where all GraphQL queries should be stored in this folder
4. create .env.local in frontend/dashboard for keycloak integration
   - VITE_USE_AUTH_GATEWAY
   - VITE_KEYCLOAK_URL
   - VITE_KEYCLOAK_REALM
   - VITE_KEYCLOAK_CLIENT
   - VITE_KEYCLOAK_SCOPE
   - VITE_GRAPH_URL
   - VITE_GRAPH_WS_URL
   - VITE_AUTH_GATEWAY_LOGIN_URL
   - VITE_LOGOUT_URL
5. pnpm dev in frontend/dashboard

## Linting, Formatting, Compiling and Testing

You can use the following commands for linting, formatting compiling and testing

- `pnpm lint`
- `pnpm format`
- `pnpm tsc`
- `pnpm test`

`pnpm lint` combines both a lint and format check.
`pnpm format` will apply any formatting changes needed
To combine linting, formatting, compiling and testing in one command use `pnpm precommit`
