import { useLazyLoadQuery } from "react-relay/hooks";
import { graphql } from "relay-runtime";
import { Visit } from "workflows-lib";
import { TemplateViewRetriggerQuery as TemplateViewRetriggerQueryType } from "./__generated__/TemplateViewRetriggerQuery.graphql";
import TemplateView from "./TemplateView";

const TemplateViewRetriggerQuery = graphql`
  query TemplateViewRetriggerQuery(
    $visit: VisitInput!
    $workflowName: String!
  ) {
    workflow(visit: $visit, name: $workflowName) {
      ...SubmissionFormParametersFragment
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
    TemplateViewRetriggerQuery,
    {
      visit,
      workflowName: workflowName,
    },
  );

  return (
    <TemplateView
      templateName={templateName}
      visit={visit}
      prepopulatedParameters={retriggerData.workflow}
    />
  );
}
