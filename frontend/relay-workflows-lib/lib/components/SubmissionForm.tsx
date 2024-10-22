import { useFragment } from "react-relay";
import { graphql } from "relay-runtime";
import { SubmissionForm as SubmissionFormBase, Visit } from "workflows-lib";
import { SubmissionFormFragment$key } from "./__generated__/SubmissionFormFragment.graphql";

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
      parametersSchema={data.arguments}
      parametersUISchema={data.uiSchema}
      visit={props.visit}
      onSubmit={props.onSubmit}
    />
  );
};

export default SubmissionForm;
