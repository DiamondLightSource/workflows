import http from 'k6/http';
import { Options } from 'k6/options';
//import { fail, check } from 'k6';
//import exec from 'k6/execution';
export { setup } from './common.ts';

const graphUrl = __ENV.GRAPH_URL
//const keycloakUrl = __ENV.KEYCLOAK_TOKEN_URL
//const clientID = __ENV.KEYCLOAK_CLIENT_ID
//const clientSecret = __ENV.KEYCLOAK_CLIENT_SECRET

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
        { duration: '1m', target: 50 },
        { duration: '2m', target: 100 },
        { duration: '1m', target: 200 },
        { duration: '1m', target: 300 },
        { duration: '1m', target: 500 },
        { duration: '1m', target: 1000 },
        { duration: '30s', target: 0 },
      ],
      gracefulRampDown: '10s',
    },
  },
  thresholds: {
    //http_req_failed: ['rate<0.05'],
    //http_req_duration: ['p(95)<2000'],
  },
};


export default function(data: { token: string }): void {



  const payload = JSON.stringify({
    query: queryExamples.listTemplates.query,
  });

  const params = {
    headers: {
      Accept: 'application/json, multipart/mixed',
      'Content-Type': 'application/json',
      Authorization: `Bearer ${data.token}`,
    },
  };
  const res = http.post(graphUrl, payload, params);
  console.log(`status=${res && res.status}`);
  console.log(`body=${res && res.body}`);
  //  console.log(`status=${data && data.status}`)
  //console.log(`body=${tokenRes && tokenRes.body}`)
}
