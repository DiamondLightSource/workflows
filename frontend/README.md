# Setting up Dev Environment

1. yarn install in frontend folder
2. Add GraphQL schema from last successful action and save as supergraph.graphql
   in frontend/relay-workflows-lib
3. yarn relay in frontend/relay-workflows-lib
   - this is where all GraphQL queries should be stored in this folder
4. create .env.local in frontend/dashboard for keycloak integration
   - VITE_KEYCLOAK_URL
   - VITE_KEYCLOAK_REALM
   - VITE_KEYCLOAK_CLIENT
   - VITE_GRAPH_URL
5. yarn dev in frontend/dashboard

## Linting, Formatting, Compiling and Testing

You can use the following commands for linting, formatting compiling and testing

- `yarn lint`
- `yarn format`
- `yarn tsc`
- `yarn test`

`yarn lint` combines both a lint and format check.
`yarn format` will apply any formatting changes needed
To combine linting, formatting, compiling and testing in one command use `yarn precommit`
