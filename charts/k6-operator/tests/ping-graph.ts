import http from 'k6/http';
import { Options } from 'k6/options';
import { fail, check } from 'k6';
import exec from 'k6/execution';

const graphUrl = __ENV.GRAPH_URL
const keycloakUrl = __ENV.KEYCLOAK_TOKEN_URL
const clientID = __ENV.KEYCLOAK_CLIENT_ID
const clientSecret = __ENV.KEYCLOAK_CLIENT_SECRET

interface VisitInput {
  proposalCode: string;
  proposalNumber: number;
  number: number;
}

interface ListWorkflowsVariables {
  visit: VisitInput;
  limit: number;
}

interface QueryExample {
  query: string;
  variables?: ListWorkflowsVariables;
}

const queryExamples: {
  listWorkflowsForVisit: QueryExample;
  listTemplates: QueryExample;
} = {
  listWorkflowsForVisit: {
    query: `
      query ListWorkflowsForVisit($visit: VisitInput!, $limit: Int) {
        workflows(visit: $visit, limit: $limit) {
          edges {
            node {
              name
              status {
                __typename
              }
            }
          }
          pageInfo {
            hasNextPage
            endCursor
          }
        }
      }
    `,
    variables: {
      visit: {
        proposalCode: 'cm',
        proposalNumber: 40661,
        number: 1,
      },
      limit: 30,
    },
  },
  listTemplates: {
    query: `
      query {
        workflowTemplates {
          nodes {
            name
            title
            description
          }
        }
      }
    `,
  },
};

export const options: Options = {
  //insecureSkipTLSVerify: true,
  scenarios: {
    ping_graph_ramp: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '60s', target: 10 },
        //{ duration: '1m', target: 50 },
        //{ duration: '2m', target: 100 },
        //{ duration: '1m', target: 200 },
        //{ duration: '1m', target: 300 },
        //{ duration: '1m', target: 500 },
        //{ duration: '1m', target: 1000 },
        //{ duration: '30s', target: 0 },
      ],
      gracefulRampDown: '10s',
    },
  },
  thresholds: {
    //http_req_failed: ['rate<0.05'],
    //http_req_duration: ['p(95)<2000'],
  },
};

export function setup(): { token: string } {
  if (!clientSecret) {
    fail('KEYCLOAK_CLIENT_SECRET requried');
  }
  if (!clientID) {
    fail('KEYCLOAK_CLIENT_ID required');
  }
  if (!keycloakUrl) {
    fail('KEYCLOAK_TOKEN_URL required');
  }
  if (!graphUrl) {
    fail('GRAPH_URL required');
  }

  const tokenRes = http.post(
    keycloakUrl,
    {
      grant_type: 'client_credentials',
      client_id: clientID,
      client_secret: clientSecret,
    }
  );

  if (tokenRes.status !== 200) {
    fail(`Token request failed: ${tokenRes.status} ${tokenRes.body}`);
  }

  check(tokenRes, {
    'verify token request was valid': (r) =>
      r.status === 200,
  });
  console.log(tokenRes.status)
  console.log(tokenRes.body)

  const tokenBody = JSON.parse(tokenRes.body as string);
  const token = tokenBody.access_token;
  if (!token) {
    exec.test.abort('No access_token in Keycloak response');
  }

  return { token };
}

export default function(data: { token: string }): void {


  const hardToken = 'eyJhbGciOiJSUzI1NiIsInR5cCIgOiAiSldUIiwia2lkIiA6ICJnTk5XYWVHTXFDWE1QY0l3eDA4ZjBsV18wcE9EX1MwV1lGeEZqbXZ0RU1RIn0.eyJleHAiOjE3NzY4NDQ2MzAsImlhdCI6MTc3Njg0MzczMCwiYXV0aF90aW1lIjoxNzc2ODQzNjUyLCJqdGkiOiJvbnJ0YWM6ZmNlZjQxMmItYTc3OC0wOGU3LTg2ZmYtODM4Yjc4ODI3YjExIiwiaXNzIjoiaHR0cHM6Ly9pZGVudGl0eS1kZXYuZGlhbW9uZC5hYy51ay9yZWFsbXMvZGxzIiwiYXVkIjpbIndvcmtmbG93cy1jbHVzdGVyLXN0YWdpbmciLCJhY2NvdW50Il0sInN1YiI6IjllZjg2ZGQ5LWUyN2MtNGNkNS1iNzc3LTY0NDI5MDA2YWUxMCIsInR5cCI6IkJlYXJlciIsImF6cCI6IndvcmtmbG93cy11aS1kZXYiLCJzaWQiOiI1ZWU3NDY1Yi0zMTZlLTQyMDAtYjk1ZS1hOTVhN2QyZjUwODYiLCJhY3IiOiIwIiwicmVhbG1fYWNjZXNzIjp7InJvbGVzIjpbImRlZmF1bHQtcm9sZXMtZGxzIiwib2ZmbGluZV9hY2Nlc3MiLCJ1bWFfYXV0aG9yaXphdGlvbiJdfSwicmVzb3VyY2VfYWNjZXNzIjp7ImFjY291bnQiOnsicm9sZXMiOlsibWFuYWdlLWFjY291bnQiLCJtYW5hZ2UtYWNjb3VudC1saW5rcyIsInZpZXctcHJvZmlsZSJdfX0sInNjb3BlIjoib3BlbmlkIGZlZGlkIGVtYWlsIHByb2ZpbGUgcG9zaXgtdWlkIiwicG9zaXhfdWlkIjoiMTIzMzM1MyIsImVtYWlsX3ZlcmlmaWVkIjpmYWxzZSwibmFtZSI6Ik1haGlyIEFiYmFzIiwicHJlZmVycmVkX3VzZXJuYW1lIjoidW1pMTM4MjciLCJmZWRpZCI6InVtaTEzODI3IiwiZ2l2ZW5fbmFtZSI6Ik1haGlyIiwiZmFtaWx5X25hbWUiOiJBYmJhcyIsImVtYWlsIjoibWFoaXIuYWJiYXNAZGlhbW9uZC5hYy51ayJ9.VatcvQahzypITCWG8-qdp_Ce1udlc-oVafJj5PSwBLOhk-SejcB7nozq_NPdNZCo6VGdya4hMyYf0A6RzBa3B5kR187Ki0sJlZpKJ4273r4cwi5j8F7Hz6JltT8nhOg4ypFSMbRKWozK5fBMgza6HkRr-Af4cxw4ZsW1AfI-OgKeaBWbxh2gs_JVtgcnrbNyvTh9r63zlCt9xY6Uv50P1hT_Oct_e3nTWUhzpPGC3lWR8QtfVnUH0k55m1Wn1FGLYt7D7lJ5J0gCnMzo2bJaPae-B2mnGWhPfAJaKF4X4z_uZFvgVWjlVgnTvJT0L3_mic2vjkxrfYD5gmfJRhlzcg';

  const payload = JSON.stringify({
    query: queryExamples.listTemplates.query,
  });

  const params = {
    headers: {
      Accept: 'application/json, multipart/mixed',
      'Content-Type': 'application/json',
      Authorization: `Bearer ${hardToken}`,
    },
  };
  const res = http.post(graphUrl, payload, params);
  console.log(`status=${res && res.status}`);
  console.log(`body=${res && res.body}`);
  //  console.log(`status=${data && data.status}`)
  //console.log(`body=${tokenRes && tokenRes.body}`)
}
