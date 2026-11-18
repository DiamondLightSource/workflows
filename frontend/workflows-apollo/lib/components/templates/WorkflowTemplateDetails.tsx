import { useMutation, useQuery } from "@apollo/client/react";
import { Progress, Visit } from "@diamondlightsource/sci-react-ui";
import { WorkflowTemplateDetails as WorkflowTemplateDetailsBase } from "workflows-ui";
import { Typography } from "@mui/material";
import { workflowTemplateQuery } from "../../apollo/queries/workflowTemplate";
import { submitWorkflowTemplateMutation } from "../../apollo/mutations/submitWorkflowTemplate";

interface WorkflowTemplateDetailsApolloProps {
  templateName: string;
}

export function WorkflowTemplateDetails({
  templateName,
}: WorkflowTemplateDetailsApolloProps) {
  const { loading, error, data } = useQuery(workflowTemplateQuery, {
    variables: { name: templateName },
  });
  const [submitWorkflowTemplate] = useMutation(submitWorkflowTemplateMutation);

  async function onSubmit(name: string, session: Visit, parameters: object) {
    await submitWorkflowTemplate({
      variables: { name, visit: session, parameters },
    });
  }

  return loading ? (
    <Progress />
  ) : error ? (
    <Typography>Error! {error.message}</Typography>
  ) : !data?.workflowTemplate ? (
    <Typography>No template data found</Typography>
  ) : (
    <WorkflowTemplateDetailsBase
      template={data.workflowTemplate}
      onSubmit={onSubmit}
    />
  );
}
