import {
  Box,
  Divider,
  Paper,
  Stack,
  Typography,
  useTheme,
} from "@mui/material";
import { JsonSchema, UISchemaElement } from "@jsonforms/core";
import { WorkflowSubmissionForm } from "./WorkflowSubmissionForm";
import { Visit as Session } from "@diamondlightsource/sci-react-ui";
import RepositoryLink from "../common/RepositoryLink";
import { TemplateSource } from "../../types";
import { kebabToTitle } from "../../utils";

export type WorkflowTemplateData = {
  name: string;
  maintainer: string;
  title: string | null;
  description: string | null;
  arguments: unknown;
  uiSchema: unknown;
  templateSource: TemplateSource | null;
};

export interface WorkflowTemplateDetailsProps {
  /** An object containing information about a workflow template */
  template: WorkflowTemplateData;
  /** If provided for this prop, a submission form will be rendered that calls this function when the submit button is pressed */
  onSubmit?: (
    name: string,
    session: Session,
    parameters: object,
  ) => Promise<void>;
  showRepoLink?: boolean;
}

export const WorkflowTemplateDetails = ({
  template,
  onSubmit,
  showRepoLink = true,
}: WorkflowTemplateDetailsProps) => {
  const theme = useTheme();

  return (
    <Paper
      sx={{
        padding: theme.spacing(2),
        display: "flex",
        flexGrow: 1,
        paddingRight: theme.spacing(16),
        overflow: "auto",
      }}
    >
      <Stack
        sx={{ paddingY: theme.spacing(4), width: "100%" }}
        spacing={theme.spacing(2)}
      >
        <Stack direction={"row"} sx={{ width: "100%" }}>
          <Typography variant="h2">
            {template.title ?? kebabToTitle(template.name)}
          </Typography>
          <Box sx={{ flexGrow: 1 }} />
          {showRepoLink && (
            <RepositoryLink repository={template.templateSource} />
          )}
        </Stack>
        <Typography>{template.description}</Typography>
        <Stack direction={"row"} spacing={theme.spacing(2)}>
          <Typography color={theme.palette.text.secondary}>
            Workflow name: <Box component="b">{template.name}</Box>
          </Typography>
          <Divider orientation="vertical" />
          <Typography color={theme.palette.text.secondary}>
            Maintainer: {template.maintainer}
          </Typography>
        </Stack>
        {onSubmit && (
          <WorkflowSubmissionForm
            name={template.name}
            uiSchema={template.uiSchema as UISchemaElement}
            args={template.arguments as JsonSchema}
            onSubmit={onSubmit}
          />
        )}
      </Stack>
    </Paper>
  );
};
