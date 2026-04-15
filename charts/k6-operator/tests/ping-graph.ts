import http, { RefinedResponse, ResponseType } from 'k6/http';
import { Options } from 'k6/options';
import { fail } from 'k6';

const token = __ENV.GRAPH_PROXY_BEARER_TOKEN;
const url = __ENV.GRAPH_PROXY_URL ?? 'http://graph-proxy.graph-proxy.svc.cluster.local:80/graphql';

if (!token) {
  fail('GRAPH_PROXY_BEARER_TOKEN required');
}

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
  const res = http.post(url, payload, params);
  console.log(`status=${res && res.status}`);
  console.log(`body=${res && res.body}`);
}
