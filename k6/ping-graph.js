import http, { head } from 'k6/http';
const diamondToken = 'eyJhbGciOiJSUzI1NiIsInR5cCIgOiAiSldUIiwia2lkIiA6ICJnTk5XYWVHTXFDWE1QY0l3eDA4ZjBsV18wcE9EX1MwV1lGeEZqbXZ0RU1RIn0.eyJleHAiOjE3NzQzNDc5NjgsImlhdCI6MTc3NDM0NzA2OCwiYXV0aF90aW1lIjoxNzc0MzQ1NTQ5LCJqdGkiOiJvbnJ0YWM6Yjg2MGU3YjgtZDA0ZS1jMzkxLTQ1M2UtODAzOGU0N2Y2NGRiIiwiaXNzIjoiaHR0cHM6Ly9pZGVudGl0eS1kZXYuZGlhbW9uZC5hYy51ay9yZWFsbXMvZGxzIiwiYXVkIjpbIndvcmtmbG93cy1jbHVzdGVyLXN0YWdpbmciLCJhY2NvdW50Il0sInN1YiI6IjllZjg2ZGQ5LWUyN2MtNGNkNS1iNzc3LTY0NDI5MDA2YWUxMCIsInR5cCI6IkJlYXJlciIsImF6cCI6IndvcmtmbG93cy11aS1kZXYiLCJzaWQiOiIxYmNlMGU3My0yN2NhLTQzOWItOGFjYy02Zjc1OWJmMDVkMGEiLCJhY3IiOiIwIiwicmVhbG1fYWNjZXNzIjp7InJvbGVzIjpbImRlZmF1bHQtcm9sZXMtZGxzIiwib2ZmbGluZV9hY2Nlc3MiLCJ1bWFfYXV0aG9yaXphdGlvbiJdfSwicmVzb3VyY2VfYWNjZXNzIjp7ImFjY291bnQiOnsicm9sZXMiOlsibWFuYWdlLWFjY291bnQiLCJtYW5hZ2UtYWNjb3VudC1saW5rcyIsInZpZXctcHJvZmlsZSJdfX0sInNjb3BlIjoib3BlbmlkIGZlZGlkIGVtYWlsIHByb2ZpbGUgcG9zaXgtdWlkIiwicG9zaXhfdWlkIjoiMTIzMzM1MyIsImVtYWlsX3ZlcmlmaWVkIjpmYWxzZSwibmFtZSI6Ik1haGlyIEFiYmFzIiwicHJlZmVycmVkX3VzZXJuYW1lIjoidW1pMTM4MjciLCJmZWRpZCI6InVtaTEzODI3IiwiZ2l2ZW5fbmFtZSI6Ik1haGlyIiwiZmFtaWx5X25hbWUiOiJBYmJhcyIsImVtYWlsIjoibWFoaXIuYWJiYXNAZGlhbW9uZC5hYy51ayJ9.fP1GYjALrcIygx_lxwhbbSaP_3mIxXW3q92qQAZqTStLIFkA8EkqQK-lfXpNFHwlpBI_X8BL5irTeF6tjk2sXmW2N210WWnGYNY0dPtlTmoie1dUkXImSJpK86P4lbAep4FBS9HKrgSrkHE3mFRfnbm2QnVHdUX_GcPRjNktBgzLlGU7lFaL0rjY6amtnK70W-ztedd6Lh44sWHwViINctEvHAcyiM4CGNk0RgTo0WI5PmGVkFUg9RllrooseXQJsbn28RbrCwVBteB4MdswLo6UpV6kPjdSbeqacv8q9ZMufr-tPTt5ItxkAcOXW-Qz0Tj1IGI4csytCvLt98wLDA';


export const options = {
    insecureSkipTLSVerify: true,
    iterations: 100000,
    vus: 1000,
};

// AUTH : keycloak client based auth
// plot data (latency vs requests e.g.) : k6 report?
// how we do automation : k6 operator, TestRun CRD
// subscriptions 
// submitting / mutations ?? (maybe not needed)
// NOTION NOTES!!!!

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
    //cookies: {
      //cf_clearance: 'jeyLJpjTHz7H5SEUxL_vZev0VhhAo68YBdxhf8ZKqYo-1765464175-1.2.1.1-Xuf0izXFOi_zkT6nrYDP8ihbvT9MxKKgZHZ5u.VLgVwhpJXlbk6iA3WTIoXWUl1bpPe9WYVmIcEjApdx9gtFL1fDdHiu9o8R0_AgRayy6gIpE85zslEkQHjvFbLCwrcfYbQkCXTd5DtchtNC9l7XSfmMIM1jduW.p_vaTbYSMjdAw3iOcCMZJ0t_TONCPI2N2LH2nr2l4bE8xre7MeRTLA.e1Hl5LIYkgC6DU8EEkX0',
    //},
  };
  const res = http.post(url, payload, params)
  console.log(`status=${res && res.status}`);
  console.log(`body=${res && res.body}`);
  res;
}

// podman k6 operator
// curl
// get k6 installed on desktop
