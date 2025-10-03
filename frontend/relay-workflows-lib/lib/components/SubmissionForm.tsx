import { useFragment } from "react-relay";
import {
  JSONObject,
  SubmissionForm as SubmissionFormBase,
  Visit,
} from "workflows-lib";
import { JsonSchema, UISchemaElement } from "@jsonforms/core";
import { graphql } from "react-relay";
import { SubmissionFormFragment$key } from "./__generated__/SubmissionFormFragment.graphql";
import { SubmissionFormParametersFragment$key } from "./__generated__/SubmissionFormParametersFragment.graphql";

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
  const parameterData = useFragment(
    SubmissionFormParametersFragment,
    prepopulatedParameters,
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
      prepopulatedParameters={parameterData?.parameters as JSONObject}
      onSubmit={onSubmit}
    />
  );
};

export default SubmissionForm;
