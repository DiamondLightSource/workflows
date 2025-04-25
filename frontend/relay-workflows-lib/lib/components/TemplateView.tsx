import { graphql } from "react-relay";
import { useLazyLoadQuery, useMutation } from "react-relay/hooks";
import { Visit } from "workflows-lib";
import SubmissionForm from "./SubmissionForm";
import { TemplateViewQuery as TemplateViewQueryType } from "./__generated__/TemplateViewQuery.graphql";
import { TemplateViewMutation as TemplateViewMutationType } from "./__generated__/TemplateViewMutation.graphql";

const TemplateViewQuery = graphql`
  query TemplateViewQuery($templateName: String!) {
    workflowTemplate(name: $templateName) {
      ...workflowTemplateFragment
    }
  }
`;

const TemplateViewMutation = graphql`
  mutation TemplateViewMutation(
    $templateName: String!
    $visit: VisitInput!
    $parameters: JSON!
  ) {
    submitWorkflowTemplate(
      name: $templateName
      visit: $visit
      parameters: $parameters
    ) {
      name
    }
  }
`;

export default function TemplateView({
  templateName,
}: {
  templateName: string;
}) {
  const data = useLazyLoadQuery<TemplateViewQueryType>(TemplateViewQuery, {
    templateName,
  });

  const [commitMutation] =
    useMutation<TemplateViewMutationType>(TemplateViewMutation);

  function submitWorkflow(visit: Visit, parameters: object) {
    commitMutation({
      variables: {
        templateName: templateName,
        visit: visit,
        parameters: parameters,
      },
    });
  }

  return (
    <>
      {templateName ? (
        <SubmissionForm
          template={data.workflowTemplate}
          onSubmit={submitWorkflow}
        />
      ) : (
        <>No Template Name provided</>
      )}
    </>
  );
}
