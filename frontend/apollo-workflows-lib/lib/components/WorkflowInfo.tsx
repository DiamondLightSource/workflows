import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Icon,
  Stack,
  Typography,
  useTheme,
} from "@mui/material";
import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown";
import { graphql } from "relay-runtime";
import { useFragment } from "react-relay";
import { WorkflowInfoFragment$key } from "./__generated__/WorkflowInfoFragment.graphql";
import RepositoryLink from "../query-components/RepositoryLink";
import { Link } from "react-router-dom";

const WorkflowInfoFragment = graphql`
  fragment WorkflowInfoFragment on Workflow {
    templateRef
    parameters
    status {
      __typename
      ... on WorkflowPendingStatus {
        message
      }
      ... on WorkflowRunningStatus {
        message
        tasks {
          name
          message
        }
      }
      ... on WorkflowSucceededStatus {
        message
        tasks {
          name
          message
        }
      }
      ... on WorkflowFailedStatus {
        message
        tasks {
          name
          message
        }
      }
      ... on WorkflowErroredStatus {
        message
        tasks {
          name
          message
        }
      }
    }
  }
`;

interface WorkflowInfoProps {
  fragmentRef: WorkflowInfoFragment$key;
}

export default function WorkflowInfo({ fragmentRef }: WorkflowInfoProps) {
  const workflow = useFragment(WorkflowInfoFragment, fragmentRef);
  const theme = useTheme();
  return (
    <Accordion sx={{ width: "100%" }} defaultExpanded>
      <AccordionSummary expandIcon={<ArrowDropDownIcon />}>
        <Typography variant="h6" component="h2">
          Workflow Information
        </Typography>
      </AccordionSummary>
      <AccordionDetails>
        {workflow.templateRef && (
          <Stack direction="row" spacing={theme.spacing(1)}>
            <Typography variant="body1">
              <strong>Template:</strong>{" "}
              <Link
                to={`/templates/${workflow.templateRef}`}
                style={{ color: theme.palette.primary.main }}
              >
                {workflow.templateRef}
              </Link>
            </Typography>
            <Icon>
              <RepositoryLink templateRef={workflow.templateRef} />
            </Icon>
          </Stack>
        )}
        <Typography variant="body1" sx={{ whiteSpace: "pre-wrap" }}>
          <strong>Parameters:</strong>{" "}
          {JSON.stringify(workflow.parameters, null, 2)}
        </Typography>
        {(workflow.status?.__typename === "WorkflowErroredStatus" ||
          workflow.status?.__typename === "WorkflowFailedStatus") && (
          <>
            <Typography sx={{ whiteSpace: "break-spaces", color: "darkred" }}>
              {workflow.status.message && (
                <Typography>
                  <strong>Workflow Error: </strong>
                  {workflow.status.message}
                </Typography>
              )}
              {workflow.status.tasks.map(
                (task) =>
                  task.message && (
                    <Typography
                      variant="body1"
                      sx={{ whiteSpace: "break-spaces", color: "darkred" }}
                    >
                      <strong>Task Name: </strong>
                      {task.name}
                      {"\n"}
                      <strong>Task Error: </strong>
                      {task.message}
                    </Typography>
                  ),
              )}
            </Typography>
          </>
        )}
      </AccordionDetails>
    </Accordion>
  );
}
