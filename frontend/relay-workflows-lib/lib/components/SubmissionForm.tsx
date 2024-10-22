import { useFragment } from "react-relay";
import { graphql } from "relay-runtime";
import { SubmissionForm as SubmissionFormBase, Visit } from "workflows-lib";
import { SubmissionFormFragment$key } from "./__generated__/SubmissionFormFragment.graphql";
import { JsonSchema, UISchemaElement } from "@jsonforms/core";

const SubmissionForm = (props: {
  template: SubmissionFormFragment$key;
  visit?: Visit;
  onSubmit?: (visit: Visit, parameters: object) => void;
}) => {
  const templateFragment = graphql`
    fragment SubmissionFormFragment on WorkflowTemplate {
      name
      title
      description
      arguments
      uiSchema
    }
  `;
  const data = useFragment(templateFragment, props.template);
  return (
    <SubmissionFormBase
      title={data.title ? data.title : data.name}
      description={data.description ? data.description : undefined}
      parametersSchema={data.arguments as JsonSchema}
      parametersUISchema={data.uiSchema as UISchemaElement}
      visit={props.visit}
      onSubmit={props.onSubmit}
    />
  );
};

export default SubmissionForm;
