import { useFragment } from "react-relay";
import { ResizableBox } from "react-resizable";
import "react-resizable/css/styles.css";
import { Box } from "@mui/material";

import { TasksFlow, WorkflowAccordion } from "workflows-lib";
import type { Task, TaskStatus, WorkflowStatus } from "workflows-lib";
import { workflowFragment$key } from "../graphql/__generated__/workflowFragment.graphql";
import { Visit } from "@diamondlightsource/sci-react-ui";
import { useNavigate } from "react-router-dom";
import { workflowFragment } from "../graphql/workflowFragment";
import RetriggerWorkflow from "./RetriggerWorkflow";

interface WorkflowRelayProps {
  workflow: workflowFragment$key;
  highlightedTaskName?: string;
  workflowLink?: boolean;
  expanded?: boolean;
}

const WorkflowRelay: React.FC<WorkflowRelayProps> = ({
  workflow,
  highlightedTaskName,
  workflowLink,
  expanded,
}) => {
  const data = useFragment(workflowFragment, workflow);
  const navigate = useNavigate();

  const statusText = data.status?.__typename ?? "Unknown";

  const tasks: Task[] =
    data.status && "tasks" in data.status
      ? data.status.tasks.map((task) => ({
          id: task.id,
          name: task.name,
          status: task.status as TaskStatus,
          depends: [...task.depends],
          artifacts: [...task.artifacts],
          workflow: data.name,
          instrumentSession: data.visit as Visit,
        }))
      : [];

  return (
    <Box
      sx={{
        width: {
          xl: "100%",
          lg: "100%",
          md: "90%",
          sm: "80%",
          xs: "70%",
        },
        maxWidth: "1200px",
        height: "100%",
        mx: "auto",
      }}
    >
      <WorkflowAccordion
        workflow={{
          name: data.name,
          instrumentSession: data.visit as Visit,
          status: statusText as WorkflowStatus,
        }}
        workflowLink={workflowLink}
        expanded={expanded}
        retriggerComponent={RetriggerWorkflow}
      >
        <ResizableBox
          width={Infinity}
          height={200}
          resizeHandles={["se"]}
          style={{
            width: "100%",
            maxWidth: "1150px",
            minWidth: "300px",
            padding: "10px",
            overflow: "auto",
            border: "2px dashed #ccc",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <TasksFlow
            tasks={tasks}
            highlightedTaskName={highlightedTaskName}
            onNavigate={(path: string) => {
              void navigate(path);
            }}
          ></TasksFlow>
        </ResizableBox>
      </WorkflowAccordion>
    </Box>
  );
};

export default WorkflowRelay;
