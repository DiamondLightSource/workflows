import http from 'k6/http';
import { Options } from 'k6/options';

export { setup } from './common.ts';

const graphUrl = __ENV.GRAPH_URL

interface VisitInput {
  proposalCode: string;
  proposalNumber: number;
  number: number;
}


const submitMutation = `mutation K6WsSubmit($templateName: String!, $visit: VisitInput!, $parameters: JSON!) { submitWorkflowTemplate(name: $templateName, visit: $visit, parameters: $parameters) { name } }`;

export const options: Options = {
  vus: 1,
  iterations: 10
}

export default function(data: { token: string }): void {
  const visit: VisitInput = {
    proposalCode: "ks",
    proposalNumber: 10000,
    number: 1
  }
  const templateName = "example-template"

  console.log(`submitting workflow template=${templateName} visit=${JSON.stringify(visit)} graphUrl=${graphUrl}`);
  http.post(
    graphUrl,
    JSON.stringify({
      query: submitMutation,
      variables: {
        templateName,
        visit,
      },
    }),
    {
      headers: {
        Authorization: `Bearer ${data.token}`,
      },
      tags: {
        endpoint: "graphql",
        operation: "submit_workflow_template",
        scenario: "graphql_ws_subscription",
      },
    },
  );


}
