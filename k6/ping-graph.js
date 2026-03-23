import http, { head } from 'k6/http';


export const options = {
    insecureSkipTLSVerify: true,
    iterations: 1,
    //vus: 100,
};

const diamondQuery = `
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
`;

const variables = {
  visit: {
    proposalCode: "mg",
    proposalNumber: 36964,
    number: 1,
  },
  name: "yeltsa-kcir",
};

//const queryExamples = {
  //getWorkflowByName: {
    //query: `
      //query GetWorkflowByName($visit: VisitInput!, $name: String!) {
        //workflow(visit: $visit, name: $name) {
          //visit {
            //proposalCode
            //proposalNumber
            //number
          //}
          //name
        //}
      //}
    //`,
    //variables: {
      //visit: {
        //proposalCode: "mg",
        //proposalNumber: 36964,
        //number: 1,
      //},
      //name: "yeltsa-kcir",
    //},
  //},
  //getWorkflowStatus: {
    //query: `
      //query GetWorkflowStatus($visit: VisitInput!, $name: String!) {
        //workflow(visit: $visit, name: $name) {
          //name
          //status {
            //__typename
          //}
        //}
      //}
    //`,
    //variables: {
      //visit: {
        //proposalCode: "mg",
        //proposalNumber: 36964,
        //number: 1,
      //},
      //name: "yeltsa-kcir",
    //},
  //},
  //getWorkflowCreator: {
    //query: `
      //query GetWorkflowCreator($visit: VisitInput!, $name: String!) {
        //workflow(visit: $visit, name: $name) {
          //name
          //creator {
            //fedid
          //}
        //}
      //}
    //`,
    //variables: {
      //visit: {
        //proposalCode: "mg",
        //proposalNumber: 36964,
        //number: 1,
      //},
      //name: "yeltsa-kcir",
    //},
  //},
  //listWorkflowTemplates: {
    //query: `
      //query ListWorkflowTemplates($first: Int) {
        //workflowTemplates(first: $first) {
          //edges {
            //node {
              //name
            //}
          //}
          //pageInfo {
            //hasNextPage
            //endCursor
          //}
        //}
      //}
    //`,
    //variables: {
      //first: 10,
    //},
  //},
  //listWorkflowsForVisit: {
    //query: `
      //query ListWorkflowsForVisit($visit: VisitInput!, $first: Int) {
        //workflows(filter: { visit: $visit }, first: $first) {
          //edges {
            //node {
              //name
              //status {
                //__typename
              //}
            //}
          //}
          //pageInfo {
            //hasNextPage
            //endCursor
          //}
        //}
      //}
    //`,
    //variables: {
      //visit: {
        //proposalCode: "mg",
        //proposalNumber: 36964,
        //number: 1,
      //},
      //first: 10,
    //},
  //},
//};


//const headers = {
  //'Authorization' : `Bearer ${diamondToken}`,
  //'Content-Type' : 'application/json',
//};


export default function () {
  //const res = http.post('https://api.github.com/graphql', JSON.stringify({query: query}), {headers: headers});
  const url = 'https://staging.workflows.diamond.ac.uk/graphql';
  const payload = JSON.stringify({
    query: diamondQuery,
    variables,
  });
  const params = {
    headers: {
      Accept: 'application/json, multipart/mixed',
      'Content-Type': 'application/json',
      Authorization: `Bearer ${diamondToken}`,
      Origin: 'https://staging.workflows.diamond.ac.uk',
      Referer: 'https://staging.workflows.diamond.ac.uk',
    },
    cookies: {
    //  cf_clearance: '',
    },
  };
  const res = http.post(url, payload, params)
  console.log(`status=${res && res.status}`);
  //console.log(`body=${res && res.body}`);
  res;
}

// podman k6 operator
// curl
// get k6 installed on desktop
