import { useFragment } from "react-relay";
import { SubmissionForm as SubmissionFormBase, Visit } from "workflows-lib";
import { JsonSchema, UISchemaElement } from "@jsonforms/core";
import { workflowTemplateFragment$key } from "../graphql/__generated__/workflowTemplateFragment.graphql";
import { workflowTemplateFragment } from "../graphql/workflowTemplateFragment";

const SubmissionForm = (props: {
  template: workflowTemplateFragment$key;
  visit?: Visit;
  onSubmit: (visit: Visit, parameters: object) => void;
}) => {
  const data = useFragment(workflowTemplateFragment, props.template);
  return (
    <SubmissionFormBase
      title={data.title ? data.title : data.name}
      maintainer={data.maintainer}
      description={data.description ? data.description : undefined}
      parametersSchema={data.arguments as JsonSchema}
      parametersUISchema={data.uiSchema as UISchemaElement}
      visit={props.visit}
      onSubmit={props.onSubmit}
    />
  );
};

export default SubmissionForm;
