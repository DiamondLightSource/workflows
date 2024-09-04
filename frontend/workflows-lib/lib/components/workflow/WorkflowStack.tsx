import React from "react";
import { Stack } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import WorkflowAccordion from "./WorkflowAccordian";
import { Workflow } from "../../types";

interface WorkflowStackProps {
  workflows: Workflow[];
}

const WorkflowStack: React.FC<WorkflowStackProps> = ({ workflows }) => {
  const theme = useTheme();

  return (
    <Stack direction="column" spacing={theme.spacing(2)} sx={{ width: "100%" }}>
      {workflows.map((workflow) => (
        <WorkflowAccordion key={workflow.name} workflow={workflow} />
      ))}
    </Stack>
  );
};

export default WorkflowStack;
