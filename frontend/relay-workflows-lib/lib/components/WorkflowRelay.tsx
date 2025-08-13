import { useSubscription } from "react-relay";
import { ResizableBox } from "react-resizable";
import "react-resizable/css/styles.css";
import { Box } from "@mui/material";
import { TasksFlow, WorkflowAccordion } from "workflows-lib";
import { Visit, visitToText } from "@diamondlightsource/sci-react-ui";
import type { WorkflowStatus } from "workflows-lib";
import RetriggerWorkflow from "./RetriggerWorkflow";
import React from "react";
import { workflowRelaySubscription as WorkflowRelaySubscriptionType } from "../graphql/__generated__/workflowRelaySubscription.graphql";
import { useParams, useNavigate } from "react-router-dom";
import { useFetchedTasks, useSelectedTasks } from "./workflowRelayUtils";
import { workflowRelaySubscription } from "../graphql/workflowRelaySubscription.ts";
import { workflowRelaySubscription$data } from "../graphql/__generated__/workflowRelaySubscription.graphql";

interface WorkflowRelayProps {
  visit: Visit;
  workflowName: string;
  workflowLink?: boolean;
  filledTaskName?: string | null;
  expanded?: boolean;
  onChange?: () => void;
}

const WorkflowRelay: React.FC<WorkflowRelayProps> = ({
  visit,
  workflowName,
  workflowLink,
  filledTaskName,
  expanded,
  onChange,
}) => {
  const [workflowData, setWorkflowData] =
    React.useState<workflowRelaySubscription$data | null>(null);

  useSubscription<WorkflowRelaySubscriptionType>({
    subscription: workflowRelaySubscription,
    variables: {
      visit: visit,
      name: workflowName,
    },
    onNext: (response?: workflowRelaySubscription$data | null) => {
      if (response) {
        setWorkflowData(response);
      }
    },
    onError: (error) => {
      console.error("Subscription error:", error);
    },
  });

  const { workflowName: workflowNameURL } = useParams<{
    workflowName: string;
  }>();
  const navigate = useNavigate();
  const statusText = workflowData?.workflow.status?.__typename ?? "Unknown";
  const fetchedTasks = useFetchedTasks(workflowData, visit, workflowName);
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
      if (workflowNameURL !== workflowName) {
        void navigate(`/workflows/${visitToText(visit)}/${workflowName}`);
      }
      setSelectedTasks(updatedTasks);
    },
    [
      navigate,
      selectedTasks,
      setSelectedTasks,
      visit,
      workflowName,
      workflowNameURL,
    ],
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
          name: workflowName,
          instrumentSession: visit,
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
            workflowName={workflowName}
            tasks={fetchedTasks}
            onNavigate={onNavigate}
            highlightedTaskNames={selectedTasks}
            filledTaskName={filledTaskName}
          ></TasksFlow>
        </ResizableBox>
      </WorkflowAccordion>
    </Box>
  );
};

export default WorkflowRelay;
