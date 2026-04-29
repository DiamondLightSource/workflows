import http, { head } from 'k6/http';
export { setup } from './common.ts';
const diamondToken = '';

interface somethingInterface {
  executor: string;
  startVUs?: number;
  stages: [{ duration: string; target: number; }]
  gracefulRampDown: string;

}

interface k6Config {
  insecureSkipTLSVerify: boolean;
  scenarios: {
    ping_graph_ramp: somethingInterface;
  }
  thresholds: {
    http_req_duration: [string];
  }
}

export const options = {
  insecureSkipTLSVerify: true,
  scenarios: {
    ping_graph_ramp: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 10 },
        { duration: '1m', target: 50 },
        { duration: '2m', target: 100 },
        { duration: '1m', target: 200 },
        { duration: '1m', target: 300 },
        { duration: '1m', target: 500 },
        { duration: '30s', target: 0 },
      ],
      gracefulRampDown: '10s',
    },
  },
  thresholds: {
    //http_req_failed: ['rate<0.05'],
    http_req_duration: ['p(95)<2000'],
  },
};


const queryExamples = {
  getWorkFlow: {
    query: `
      query GetWorkFlow($visit: VisitInput!, $name: String!) {
        workflow(visit: $visit, name: $name) {
          visit {
            proposalCode
            proposalNumber
            number
          }
          name
        }
      }
    `,
    variables: {
      visit: {
        proposalCode: "mg",
        proposalNumber: 36964,
        number: 1,
      },
      name: "yeltsa-kcir",
    },
  },
  getWorkflowByName: {
    query: `
      query GetWorkflowByName($visit: VisitInput!, $name: String!) {
        workflow(visit: $visit, name: $name) {
          visit {
            proposalCode
            proposalNumber
            number
          }
          name
        }
      }
    `,
    variables: {
      visit: {
        proposalCode: "mg",
        proposalNumber: 36964,
        number: 1,
      },
      name: "yeltsa-kcir",
    },
  },
  getWorkflowStatus: {
    query: `
      query GetWorkflowStatus($visit: VisitInput!, $name: String!) {
        workflow(visit: $visit, name: $name) {
          name
          status {
            __typename
          }
        }
      }
    `,
    variables: {
      visit: {
        proposalCode: "mg",
        proposalNumber: 36964,
        number: 1,
      },
      name: "yeltsa-kcir",
    },
  },
  getWorkflowCreator: {
    query: `
      query GetWorkflowCreator($visit: VisitInput!, $name: String!) {
        workflow(visit: $visit, name: $name) {
          name
          creator {
            fedid
          }
        }
      }
    `,
    variables: {
      visit: {
        proposalCode: "mg",
        proposalNumber: 36964,
        number: 1,
      },
      name: "yeltsa-kcir",
    },
  },
  listWorkflowTemplates: {
    query: `
      query ListWorkflowTemplates($first: Int) {
        workflowTemplates(first: $first) {
          edges {
            node {
              name
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
      first: 10,
    },
  },
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
        proposalCode: "cm",
        proposalNumber: 40661,
        number: 1,
      },
      limit: 30,
    },
  },
};


const headers = {
  'Authorization': `Bearer ${diamondToken}`,
  'Content-Type': 'application/json',
};


export default function() {
  //const res = http.post('https://api.github.com/graphql', JSON.stringify({query: query}), {headers: headers});
  const url = 'https://staging.workflows.diamond.ac.uk/graphql';
  const payload = JSON.stringify({
    query: queryExamples.listWorkflowsForVisit.query,
    variables: queryExamples.listWorkflowsForVisit.variables,
  });
  const params = {
    headers: {
      Accept: 'application/json, multipart/mixed',
      'Content-Type': 'application/json',
      Authorization: `Bearer ${diamondToken}`,
      Origin: 'https://staging.workflows.diamond.ac.uk',
      Referer: 'https://staging.workflows.diamond.ac.uk',
    },
  };
  const res = http.post(url, payload, params)
  console.log(`status=${res && res.status}`);
  console.log(`body=${res && res.body}`);
  res;
}

