import {
  useCallback,
  useEffect,
  useRef,
  type Dispatch,
  type MouseEvent as ReactMouseEvent,
  type SetStateAction,
} from "react";
import { ResizableBox } from "react-resizable";
import { Box } from "@mui/material";
import { WorkflowAccordion, type WorkflowStatus } from "workflows-lib";
import RetriggerWorkflow from "../query-components/RetriggerWorkflow";
import { useSelectedTaskIds } from "../utils/workflowRelayUtils";
import { graphql } from "relay-runtime";
import { useFragment } from "react-relay";
import type { BaseWorkflowRelayFragment$key } from "./__generated__/BaseWorkflowRelayFragment.graphql";
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
  onSelectTask?: (taskId: string | null) => void;
}

export default function BaseWorkflowRelay({
  workflowLink,
  filledTaskId,
  expanded,
  onChange,
  fragmentRef,
  onSelectTask,
}: BaseWorkflowRelayProps) {
  const data = useFragment(BaseWorkflowRelayFragment, fragmentRef);

  const workflowId = data.id;

  const statusText = data.status?.__typename ?? "Unknown";

  const submittedTime =
    data.status && "startTime" in data.status
      ? (data.status.startTime as string | undefined)
      : undefined;

  const [selectedTaskIds, setSelectedTaskIds] = useSelectedTaskIds() as [
    string[],
    Dispatch<SetStateAction<string[]>>,
  ];

  /*
   * IMPORTANT:
   *
   * Do not put `selectedTaskIds` in this callback's dependency list.
   *
   * The previous implementation did this:
   *
   *   [onSelectTask, selectedTaskIds, setSelectedTaskIds]
   *
   * Every task click changed selectedTaskIds, which recreated onNavigate.
   * TasksFlow then received a new onNavigate, ReactFlow recreated its
   * nodeTypes, and the task node could be replaced while the mouse event
   * was being processed.
   *
   * Using the functional state update means we always receive the latest
   * selectedTaskIds without making this callback depend on them.
   */
  const selectedTaskIdsRef = useRef(selectedTaskIds);

  useEffect(() => {
    selectedTaskIdsRef.current = selectedTaskIds;
  }, [selectedTaskIds]);

  const onNavigate = useCallback(
    (taskId: string, event?: ReactMouseEvent): void => {
      event?.preventDefault();
      event?.stopPropagation();

      const isCtrl: boolean = Boolean(event?.ctrlKey || event?.metaKey);
      const currentTaskIds = selectedTaskIdsRef.current;

      // Normal click on the only currently selected task:
      // deselect it and restore all workflow logs.
      if (
        !isCtrl &&
        currentTaskIds.length === 1 &&
        currentTaskIds[0] === taskId
      ) {
        setSelectedTaskIds([]);
        onSelectTask?.(null);
        return;
      }

      // Normal click on a different task:
      // select only that task and show its logs.
      if (!isCtrl) {
        setSelectedTaskIds([taskId]);
        onSelectTask?.(taskId);
        return;
      }

      // Ctrl/Cmd-click keeps the existing multi-selection behaviour.
      const isSelected = currentTaskIds.includes(taskId);

      setSelectedTaskIds((currentTaskIds) =>
        isSelected
          ? currentTaskIds.filter((id) => id !== taskId)
          : [...currentTaskIds, taskId],
      );

      onSelectTask?.(taskId);
    },
    [onSelectTask, setSelectedTaskIds],
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
            workflowId={workflowId}
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
