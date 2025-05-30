import React from "react";
import { Link, useResolvedPath } from "react-router-dom";
import {
  Accordion,
  AccordionSummary,
  Box,
  styled,
  Typography,
} from "@mui/material";
import MuiAccordionDetails from "@mui/material/AccordionDetails";
import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import { getWorkflowStatusIcon } from "../common/StatusIcons";
import { Workflow } from "../../types";

interface WorkflowProps {
  workflow: Workflow;
  children: React.ReactNode;
  workflowLink?: boolean;
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
  workflowLink = false,
  expanded = false,
}) => {
  const resolvedPath = useResolvedPath(workflow.name);
  return (
    <Accordion key={workflow.name} defaultExpanded={expanded}>
      <AccordionSummary expandIcon={<ArrowDropDownIcon />}>
        <Box sx={{ display: "flex", flexGrow: 1, gap: 2 }}>
          {getWorkflowStatusIcon(workflow.status)}
          {workflowLink && (
            <Link to={resolvedPath}>
              <OpenInNewIcon />
            </Link>
          )}
          <Typography>{workflow.name}</Typography>
        </Box>
      </AccordionSummary>
      <AccordionDetails>{children}</AccordionDetails>
    </Accordion>
  );
};

export default WorkflowAccordion;
