import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Typography,
} from "@mui/material";
import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown";
import { graphql } from "relay-runtime";
import { useFragment } from "react-relay";
import { WorkflowInfoFragment$key } from "./__generated__/WorkflowInfoFragment.graphql";

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
  return (
    <Accordion sx={{ width: "100%" }} defaultExpanded>
      <AccordionSummary expandIcon={<ArrowDropDownIcon />}>
        <Typography variant="h6">Workflow Information</Typography>
      </AccordionSummary>
      <AccordionDetails>
        <Typography variant="body1">
          <strong>Template:</strong> {workflow.templateRef}
        </Typography>
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
