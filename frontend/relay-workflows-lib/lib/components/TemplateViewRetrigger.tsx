import { useLazyLoadQuery } from "react-relay/hooks";
import { graphql } from "relay-runtime";
import { JSONObject, Visit } from "workflows-lib";
import { TemplateViewRetriggerQuery as TemplateViewRetriggerQueryType } from "./__generated__/TemplateViewRetriggerQuery.graphql";
import TemplateView from "./TemplateView";

const templateViewRetriggerQuery = graphql`
  query TemplateViewRetriggerQuery(
    $visit: VisitInput!
    $workflowname: String!
  ) {
    workflow(visit: $visit, name: $workflowname) {
      parameters
    }
  }
`;

export default function TemplateViewWithRetrigger({
  templateName,
  workflowName,
  visit,
}: {
  templateName: string;
  workflowName: string;
  visit: Visit;
}) {
  const retriggerData = useLazyLoadQuery<TemplateViewRetriggerQueryType>(
    templateViewRetriggerQuery,
    {
      visit,
      workflowname: workflowName,
    },
  );
  const prepopulatedParameters = retriggerData.workflow
    .parameters as JSONObject;

  return (
    <TemplateView
      templateName={templateName}
      visit={visit}
      prepopulatedParameters={prepopulatedParameters}
    />
  );
}
