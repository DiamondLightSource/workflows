import { useLazyLoadQuery } from "react-relay/hooks";
import { graphql } from "relay-runtime";
import { Visit } from "workflows-lib";
import { TemplateViewRetriggerQuery as TemplateViewRetriggerQueryType } from "./__generated__/TemplateViewRetriggerQuery.graphql";
import TemplateView from "./TemplateView";

export const TemplateViewRetriggerQuery = graphql`
  query TemplateViewRetriggerQuery($id: ID!) {
    workflowById(id: $id) {
      ...SubmissionFormParametersFragment
    }
  }
`;

export default function TemplateViewWithRetrigger({
  templateName,
  workflowId,
  visit,
}: {
  templateName: string;
  workflowId: string;
  visit?: Visit;
}) {
  const retriggerData = useLazyLoadQuery<TemplateViewRetriggerQueryType>(
    TemplateViewRetriggerQuery,
    {
      id: workflowId,
    },
  );

  return (
    <TemplateView
      templateName={templateName}
      visit={visit}
      prepopulatedParameters={retriggerData.workflowById ?? undefined}
      workflowId={workflowId}
    />
  );
}
