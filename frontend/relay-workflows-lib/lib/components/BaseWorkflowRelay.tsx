import React from "react";
import { ResizableBox } from "react-resizable";
import { Box } from "@mui/material";
import { WorkflowAccordion, type WorkflowStatus } from "workflows-lib";
import RetriggerWorkflow from "../query-components/RetriggerWorkflow";
import { useSelectedTaskIds } from "../utils/workflowRelayUtils";
import { graphql } from "relay-runtime";
import { useFragment } from "react-relay";
import { BaseWorkflowRelayFragment$key } from "./__generated__/BaseWorkflowRelayFragment.graphql";
import TasksFlow from "./TasksFlow";

export const BaseWorkflowRelayFragment = graphql`
  fragment BaseWorkflowRelayFragment on Workflow {
    name
    id
    visit {
      proposalCode
      proposalNumber
      number
    }
    creator {
      creatorId
    }
    status {
      __typename

      ... on WorkflowRunningStatus {
        startTime
      }

      ... on WorkflowSucceededStatus {
        startTime
      }

      ... on WorkflowFailedStatus {
        startTime
      }

      ... on WorkflowErroredStatus {
        startTime
      }
    }

    ...WorkflowTasksFragment
  }
`;

interface BaseWorkflowRelayProps {
  workflowLink?: boolean;
  filledTaskId?: string | null;
  expanded?: boolean;
  onChange?: () => void;
  fragmentRef: BaseWorkflowRelayFragment$key;
  onSelectTask?: (taskId: string) => void;
}

export default function BaseWorkflowRelay({
  workflowLink,
  filledTaskId,
  expanded,
  onChange,
  fragmentRef,
  onSelectTask,
}: BaseWorkflowRelayProps) {
  const { workflowName: workflowNameURL } = useParams<{
    workflowName: string;
  }>();

  const navigate = useNavigate();

  const data = useFragment(BaseWorkflowRelayFragment, fragmentRef);

  const statusText = data.status?.__typename ?? "Unknown";
  const submittedTime =
    data.status?.__typename === "WorkflowRunningStatus" ||
    data.status?.__typename === "WorkflowSucceededStatus" ||
    data.status?.__typename === "WorkflowFailedStatus" ||
    data.status?.__typename === "WorkflowErroredStatus"
      ? data.status.startTime
      : undefined;

  const [selectedTaskIds, setSelectedTaskIds] = useSelectedTaskIds();

  const onNavigate = React.useCallback(
    (taskId: string, event?: React.MouseEvent) => {
      const isCtrl = event?.ctrlKey || event?.metaKey;

      let updatedTaskIds: string[];
      console.log("TASK CLICKED", taskId);

      if (isCtrl) {
        updatedTaskIds = selectedTaskIds.includes(taskId)
          ? selectedTaskIds.filter((id) => id !== taskId)
          : [...selectedTaskIds, taskId];
      } else {
        updatedTaskIds = [taskId];
      }
      setSelectedTaskIds(updatedTaskIds);

      if (workflowNameURL !== data.name) {
        void navigate(`/workflows/${visitToText(data.visit)}/${data.name}`);
      }

      if (onSelectTask) {
        onSelectTask(taskId);
      }
    },
    [
      navigate,
      selectedTaskIds,
      setSelectedTaskIds,
      workflowNameURL,
      data,
      onSelectTask,
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
          name: data.name,
          id: data.id,
          instrumentSession: data.visit,
          status: statusText as WorkflowStatus,
          creator: data.creator.creatorId,
          submittedTime,
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
            workflowId={data.id}
            tasksRef={data}
            onNavigate={onNavigate}
            highlightedTaskIds={selectedTaskIds}
            filledTaskId={filledTaskId}
          />
        </ResizableBox>
      </WorkflowAccordion>
    </Box>
  );
}
