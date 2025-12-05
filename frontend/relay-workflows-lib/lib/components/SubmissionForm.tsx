import { useFragment } from "react-relay";
import { SubmissionForm as SubmissionFormBase, Visit } from "workflows-lib";
import { JsonSchema, UISchemaElement } from "@jsonforms/core";
import { graphql } from "react-relay";
import { SubmissionFormFragment$key } from "./__generated__/SubmissionFormFragment.graphql";
import { SubmissionFormParametersFragment$key } from "./__generated__/SubmissionFormParametersFragment.graphql";
import { useSearchParams } from "react-router-dom";
import { mergeParameters } from "../utils/workflowRelayUtils";

export const SubmissionFormFragment = graphql`
  fragment SubmissionFormFragment on WorkflowTemplate {
    name
    maintainer
    title
    description
    arguments
    uiSchema
    repository
  }
`;

export const SubmissionFormParametersFragment = graphql`
  fragment SubmissionFormParametersFragment on Workflow {
    parameters
  }
`;

const SubmissionForm = ({
  template,
  prepopulatedParameters,
  visit,
  onSubmit,
}: {
  template: SubmissionFormFragment$key;
  prepopulatedParameters?: SubmissionFormParametersFragment$key;
  visit?: Visit;
  onSubmit: (visit: Visit, parameters: object) => void;
}) => {
  const data = useFragment(SubmissionFormFragment, template);
  const reusedParameterData = useFragment(
    SubmissionFormParametersFragment,
    prepopulatedParameters,
  );
  const [searchParams] = useSearchParams();

  const autofilledParameters = mergeParameters(
    reusedParameterData,
    searchParams,
  );

  return (
    <SubmissionFormBase
      title={data.title ?? data.name}
      maintainer={data.maintainer}
      repository={data.repository}
      description={data.description ?? undefined}
      parametersSchema={data.arguments as JsonSchema}
      parametersUISchema={data.uiSchema as UISchemaElement}
      visit={visit}
      prepopulatedParameters={autofilledParameters}
      onSubmit={onSubmit}
    />
  );
};

export default SubmissionForm;
