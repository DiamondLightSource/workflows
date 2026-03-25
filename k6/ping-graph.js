import http, { head } from 'k6/http';
const diamondToken = 'eyJhbGciOiJSUzI1NiIsInR5cCIgOiAiSldUIiwia2lkIiA6ICJnTk5XYWVHTXFDWE1QY0l3eDA4ZjBsV18wcE9EX1MwV1lGeEZqbXZ0RU1RIn0.eyJleHAiOjE3NzQ0MzQzMDEsImlhdCI6MTc3NDQzMzQwMSwiYXV0aF90aW1lIjoxNzc0NDMzMTk0LCJqdGkiOiJvbnJ0YWM6NGZlODhlM2EtZjZmMC00NWFkLWUzYTktMTNjZGI5MTk4ZDgyIiwiaXNzIjoiaHR0cHM6Ly9pZGVudGl0eS1kZXYuZGlhbW9uZC5hYy51ay9yZWFsbXMvZGxzIiwiYXVkIjpbIndvcmtmbG93cy1jbHVzdGVyLXN0YWdpbmciLCJhY2NvdW50Il0sInN1YiI6IjllZjg2ZGQ5LWUyN2MtNGNkNS1iNzc3LTY0NDI5MDA2YWUxMCIsInR5cCI6IkJlYXJlciIsImF6cCI6IndvcmtmbG93cy11aS1kZXYiLCJzaWQiOiJkMmI5OGM1Yy1mNDg4LTRjMzQtYTk5OS05NzZiYTIzNDNmYTkiLCJhY3IiOiIwIiwicmVhbG1fYWNjZXNzIjp7InJvbGVzIjpbImRlZmF1bHQtcm9sZXMtZGxzIiwib2ZmbGluZV9hY2Nlc3MiLCJ1bWFfYXV0aG9yaXphdGlvbiJdfSwicmVzb3VyY2VfYWNjZXNzIjp7ImFjY291bnQiOnsicm9sZXMiOlsibWFuYWdlLWFjY291bnQiLCJtYW5hZ2UtYWNjb3VudC1saW5rcyIsInZpZXctcHJvZmlsZSJdfX0sInNjb3BlIjoib3BlbmlkIGZlZGlkIGVtYWlsIHByb2ZpbGUgcG9zaXgtdWlkIiwicG9zaXhfdWlkIjoiMTIzMzM1MyIsImVtYWlsX3ZlcmlmaWVkIjpmYWxzZSwibmFtZSI6Ik1haGlyIEFiYmFzIiwicHJlZmVycmVkX3VzZXJuYW1lIjoidW1pMTM4MjciLCJmZWRpZCI6InVtaTEzODI3IiwiZ2l2ZW5fbmFtZSI6Ik1haGlyIiwiZmFtaWx5X25hbWUiOiJBYmJhcyIsImVtYWlsIjoibWFoaXIuYWJiYXNAZGlhbW9uZC5hYy51ayJ9.JecLAJDmYbcQ1A_kCkDpu4Dbbgc6EYeX4C0rheREG7GeoygFj1AuaMtxmXfrlk8-yC2uVJ03p-OW2t_9ZF0fHTRAv7P1YOqvIbNRkXEqEbJrMx4o6AyljS6DC8fP1CqCFrEEkGkH_9CTr0o5cW1STaOUi3HLVhOAaEzzVXHpBgKyH7YYoeMXxOtAKeFfBYRdcIg2RkkjG9cGWjhjrTTczFO2vcPvfNFU_bhpxVPjHczpGjIxa-3m5tJ4wbS-dUIFrQMAlE2lGPsafrrk2SCEdTUdx0myBaqImL9Nfu5Zkir4XOZh2H8hCrNscrzhfWEkS2wcbHf2jaNjT3uSTY9GgA';


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

// AUTH : keycloak client based auth
// plot data (latency vs requests e.g.) : k6 report?
// how we do automation : k6 operator, TestRun CRD
// subscriptions 
// submitting / mutations 
// NOTION NOTES!!!!
// TODO: get a graphql subscription running
// polling cluster (prometheus / grafana)
// start going through list

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
        proposalCode: "mg",
        proposalNumber: 36964,
        number: 1,
      },
      limit: 30,
    },
  },
};


const headers = {
  'Authorization' : `Bearer ${diamondToken}`,
  'Content-Type' : 'application/json',
};


export default function () {
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

// podman k6 operator
// curl
// get k6 installed on desktop
