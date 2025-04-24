# Setting up Dev Environment

1. yarn relay in frontend/relay-workflows-lib
    - this is where all GraphQL queries should be stored in this folder
2. create .env.local in frontend/dashboard for keycloak integration
    - VITE_KEYCLOAK_URL
    - VITE_KEYCLOAK_REALM
    - VITE_KEYCLOAK_CLIENT
3. yarn dev in frontend/dashboard
