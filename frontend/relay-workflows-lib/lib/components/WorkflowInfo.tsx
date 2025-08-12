import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Typography,
} from "@mui/material";
import { workflowRelayQuery$data } from "../graphql/__generated__/workflowRelayQuery.graphql";
import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown";

export default function WorkflowInfo({ workflow }: workflowRelayQuery$data) {
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
      </AccordionDetails>
    </Accordion>
  );
}
