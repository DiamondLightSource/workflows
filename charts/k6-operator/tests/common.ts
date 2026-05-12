import http from 'k6/http';
import { check, fail } from 'k6';
import exec from 'k6/execution';

const graphUrl = __ENV.GRAPH_URL;
const keycloakUrl = __ENV.KEYCLOAK_TOKEN_URL;
const clientID = __ENV.KEYCLOAK_CLIENT_ID;
const clientSecret = __ENV.KEYCLOAK_CLIENT_SECRET;

//setup function for k6. Get's auth token from keycloak
export function setup(): { token: string } {
  if (!clientSecret) fail('KEYCLOAK_CLIENT_SECRET required');
  if (!clientID) fail('KEYCLOAK_CLIENT_ID required');
  if (!keycloakUrl) fail('KEYCLOAK_TOKEN_URL required');
  if (!graphUrl) fail('GRAPH_URL required');

  const tokenRes = http.post(
    keycloakUrl, {
    grant_type: 'client_credentials',
    client_id: clientID,
    client_secret: clientSecret,
  });

  check(tokenRes, {
    'keycloak token request succeeded': (r) => r.status === 200,
  });

  if (tokenRes.status !== 200) {
    fail(`Token request failed: ${tokenRes.status} ${tokenRes.body}`);
  }

  const tokenBody = JSON.parse(tokenRes.body as string);
  const token = tokenBody.access_token;
  if (!token) {
    exec.test.abort('No access_token in Keycloak response');
  }

  return { token };
}
