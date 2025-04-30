import React from "react";
import { Typography, Accordion, AccordionSummary, styled } from "@mui/material";
import MuiAccordionDetails from "@mui/material/AccordionDetails";
import { getWorkflowStatusIcon } from "../common/StatusIcons";
import { Workflow } from "../../types";

interface WorkflowProps {
  workflow: Workflow;
  children: React.ReactNode;
  expanded?: boolean;
}

const AccordionDetails = styled(MuiAccordionDetails)(({ theme }) => ({
  padding: theme.spacing(1),
  borderTop: "1px solid rgba(0, 0, 0, .125)",
  height: "250px",
}));

const WorkflowAccordion: React.FC<WorkflowProps> = ({
  workflow,
  children,
  expanded = false,
}) => {
  return (
    <Accordion key={workflow.name} defaultExpanded={expanded}>
      <AccordionSummary
        expandIcon={getWorkflowStatusIcon(workflow.status)}
        sx={{
          "& .MuiAccordionSummary-expandIconWrapper.Mui-expanded": {
            transform: "none",
          },
        }}
      >
        <Typography>{workflow.name}</Typography>
      </AccordionSummary>
      <AccordionDetails>{children}</AccordionDetails>
    </Accordion>
  );
};

export default WorkflowAccordion;
