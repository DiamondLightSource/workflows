import { useFragment } from "react-relay";
import { SubmissionForm as SubmissionFormBase, Visit } from "workflows-lib";
import { JsonSchema, UISchemaElement } from "@jsonforms/core";
import { graphql } from "react-relay";
import { SubmissionFormFragment$key } from "./__generated__/SubmissionFormFragment.graphql";
import { SubmissionFormParametersFragment$key } from "./__generated__/SubmissionFormParametersFragment.graphql";
import { Link, useSearchParams } from "react-router-dom";
import { mergeParameters } from "../utils/workflowRelayUtils";
import { Stack, Typography, useTheme } from "@mui/material";
import { Info } from "@mui/icons-material";
import { visitToText } from "@diamondlightsource/sci-react-ui";

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
  workflowName,
}: {
  template: SubmissionFormFragment$key;
  prepopulatedParameters?: SubmissionFormParametersFragment$key;
  visit?: Visit;
  onSubmit: (visit: Visit, parameters: object) => void;
  workflowName?: string;
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

  const parametersSchema = data.arguments as JsonSchema;

  const overriddenKeys = Array.from(new Set(searchParams.keys())).filter(
    (key) => {
      return parametersSchema.properties && key in parametersSchema.properties;
    },
  );

  const theme = useTheme();

  const parameterMessage = (
    <>
      <Stack
        direction={"row"}
        alignItems={"flex-start"}
        display="inline-flex"
        spacing={theme.spacing(1)}
      >
        <Info fontSize="small" />
        <Typography>
          {workflowName && (
            <>
              Parameter values have been reused from{" "}
              <Link to={`/workflows/${visitToText(visit)}/${workflowName}`}>
                {workflowName}
              </Link>
              .{" "}
            </>
          )}
          {!!overriddenKeys.length && (
            <>
              The following parameters have been overwritten by values from the
              URL link: '{overriddenKeys.join("', '")}'
            </>
          )}
        </Typography>
      </Stack>
    </>
  );

  return (
    <SubmissionFormBase
      title={data.title ?? data.name}
      maintainer={data.maintainer}
      repository={data.repository}
      description={data.description ?? undefined}
      parametersSchema={parametersSchema}
      parametersUISchema={data.uiSchema as UISchemaElement}
      visit={visit}
      prepopulatedParameters={autofilledParameters}
      onSubmit={onSubmit}
      parameterMessage={
        overriddenKeys.length || reusedParameterData
          ? parameterMessage
          : undefined
      }
    />
  );
};

export default SubmissionForm;
