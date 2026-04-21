import http from 'k6/http';
import { Options } from 'k6/options';
import { fail, check } from 'k6';

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
  variables: ListWorkflowsVariables;
}

const queryExamples: { listWorkflowsForVisit: QueryExample } = {
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

export default function(): void {
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
    },
    {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    },
  );

  //  if (tokenRes.status !== 200) {
  //   fail(`Token request failed: ${tokenRes.status} ${tokenRes.body}`);
  // }
  check(tokenRes, {
    'verify token request was valid': (r) =>
      r.status === 200,
  });

  const tokenBody = JSON.parse(tokenRes.body as string);
  const token = tokenBody.access_token;
  if (!token) {
    fail('No access_token in Keycloak response');
  }

  const payload = JSON.stringify({
    query: queryExamples.listWorkflowsForVisit.query,
    variables: queryExamples.listWorkflowsForVisit.variables,
  });

  const params = {
    headers: {
      Accept: 'application/json, multipart/mixed',
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  };
  const res = http.post(graphUrl, payload, params);
  console.log(`status=${res && res.status}`);
  console.log(`body=${res && res.body}`);
}
