import { useFragment } from "react-relay";
import { ResizableBox } from "react-resizable";
import "react-resizable/css/styles.css";

import { TasksFlow, WorkflowAccordion } from "workflows-lib";
import type { Task, TaskStatus, WorkflowStatus } from "workflows-lib";
import {   workflowFragment$key } from "./__generated__/workflowFragment.graphql";
import { Visit } from "@diamondlightsource/sci-react-ui";
import { useNavigate } from "react-router-dom";
import { workflowFragment } from "./workflowFragment";

interface WorkflowRelayProps {
  workflow:   workflowFragment$key;
  children: React.ReactNode;
  expanded?: boolean;
}

const WorkflowRelay: React.FC<WorkflowRelayProps> = ({
  workflow,
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
    <WorkflowAccordion
      workflow={{
        name: data.name,
        status: statusText as WorkflowStatus,
      }}
      expanded={expanded}
    >
      <ResizableBox
        width={1150}
        height={400}
        resizeHandles={["se"]}
        style={{
          border: "2px dashed #ccc",
          padding: "10px",
          overflow: "auto",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <TasksFlow
          tasks={tasks}
          onNavigate={(path: string) => {
            void navigate(path);
          }}
        ></TasksFlow>
      </ResizableBox>
    </WorkflowAccordion>
  );
};

export default WorkflowRelay;
