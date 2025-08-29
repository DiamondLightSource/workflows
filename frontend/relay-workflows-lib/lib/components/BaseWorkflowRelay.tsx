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
import { useFetchedTasks, useSelectedTaskIds } from "./workflowRelayUtils";
import { workflowRelaySubscription$data } from "../graphql/__generated__/workflowRelaySubscription.graphql";
import { useParams, useNavigate } from "react-router-dom";

interface BaseWorkflowRelayProps {
  workflowLink?: boolean;
  filledTaskId?: string | null;
  expanded?: boolean;
  onChange?: () => void;
  data: workflowRelaySubscription$data;
}

export default function BaseWorkflowRelay({
  workflowLink,
  filledTaskId,
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
  const [selectedTaskIds, setSelectedTaskIds] = useSelectedTaskIds();

  const onNavigate = React.useCallback(
    (taskId: string, event?: React.MouseEvent) => {
      const isCtrl = event?.ctrlKey || event?.metaKey;

      let updatedTaskIds: string[];

      if (isCtrl) {
        updatedTaskIds = selectedTaskIds.includes(taskId)
          ? selectedTaskIds.filter((id) => id !== taskId)
          : [...selectedTaskIds, taskId];
      } else {
        updatedTaskIds = [taskId];
      }
      if (workflowNameURL !== data.workflow.name) {
        void navigate(
          `/workflows/${visitToText(data.workflow.visit)}/${data.workflow.name}`,
        );
      }
      setSelectedTaskIds(updatedTaskIds);
    },
    [navigate, selectedTaskIds, setSelectedTaskIds, workflowNameURL, data],
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
            highlightedTaskIds={selectedTaskIds}
            filledTaskId={filledTaskId}
          />
        </ResizableBox>
      </WorkflowAccordion>
    </Box>
  );
}
