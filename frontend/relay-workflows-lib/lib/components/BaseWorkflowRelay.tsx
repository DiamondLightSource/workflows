import React from "react";
import { ResizableBox } from "react-resizable";
import { Box } from "@mui/material";
import { visitToText } from "@diamondlightsource/sci-react-ui";
import {
  TasksFlow,
  WorkflowAccordion,
  type WorkflowStatus,
} from "workflows-lib";
import RetriggerWorkflow from "./RetriggerWorkflow";
import { useFetchedTasks, useSelectedTasks } from "./workflowRelayUtils";
import { workflowRelaySubscription$data } from "../graphql/__generated__/workflowRelaySubscription.graphql";
import { useParams, useNavigate } from "react-router-dom";

interface BaseWorkflowRelayProps {
  workflowLink?: boolean;
  filledTaskName?: string | null;
  expanded?: boolean;
  onChange?: () => void;
  data: workflowRelaySubscription$data;
}

export default function BaseWorkflowRelay({
  workflowLink,
  filledTaskName,
  expanded,
  onChange,
  data,
}: BaseWorkflowRelayProps) {
  const { workflowName: workflowNameURL } = useParams<{
    workflowName: string;
  }>();
  const navigate = useNavigate();
  const statusText = data.workflow.status?.__typename ?? "Unknown";
  const fetchedTasks = useFetchedTasks(data);
  const [selectedTasks, setSelectedTasks] = useSelectedTasks();

  const onNavigate = React.useCallback(
    (path: string, event?: React.MouseEvent) => {
      const taskName = String(path.split("/").filter(Boolean).pop());
      const isCtrl = event?.ctrlKey || event?.metaKey;

      let updatedTasks: string[];

      if (isCtrl) {
        updatedTasks = selectedTasks.includes(taskName)
          ? selectedTasks.filter((name) => name !== taskName)
          : [...selectedTasks, taskName];
      } else {
        updatedTasks = [taskName];
      }
      if (workflowNameURL !== data.workflow.name) {
        void navigate(
          `/workflows/${visitToText(data.workflow.visit)}/${data.workflow.name}`,
        );
      }
      setSelectedTasks(updatedTasks);
    },
    [navigate, selectedTasks, setSelectedTasks, workflowNameURL, data],
  );

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
          name: data.workflow.name,
          instrumentSession: data.workflow.visit,
          status: statusText as WorkflowStatus,
        }}
        workflowLink={workflowLink}
        expanded={expanded}
        onChange={onChange}
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
            workflowName={data.workflow.name}
            tasks={fetchedTasks}
            onNavigate={onNavigate}
            highlightedTaskNames={selectedTasks}
            filledTaskName={filledTaskName}
          />
        </ResizableBox>
      </WorkflowAccordion>
    </Box>
  );
}
