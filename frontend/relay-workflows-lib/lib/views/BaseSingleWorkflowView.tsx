import { useCallback, useEffect, useMemo, useState } from "react";
import { Box, ToggleButton } from "@mui/material";
import { Artifact, Task, TaskInfo, buildTaskTree } from "workflows-lib";
import {
  useFetchedTasks,
  useSelectedTaskIds,
} from "../utils/workflowRelayUtils";
import WorkflowInfo from "../components/WorkflowInfo";
import { graphql, useFragment } from "react-relay";
import { BaseSingleWorkflowViewFragment$key } from "./__generated__/BaseSingleWorkflowViewFragment.graphql";
import BaseWorkflowRelay from "../components/BaseWorkflowRelay";
import { TaskLogViewer } from "./TaskLogViewer";

export const BaseSingleWorkflowViewFragment = graphql`
  fragment BaseSingleWorkflowViewFragment on Workflow @relay(mask: false) {
    name
    visit {
      proposalCode
      proposalNumber
      number
    }
    status {
      __typename
    }
    ...BaseWorkflowRelayFragment
    ...WorkflowRelayFragment
    ...WorkflowInfoFragment
    ...WorkflowTasksFragment
  }
`;

interface BaseSingleWorkflowViewProps {
  fragmentRef: BaseSingleWorkflowViewFragment$key | null;
  taskIds?: string[];
  onSelectTask?: (taskId: string) => void;
}

export default function BaseSingleWorkflowView({
  taskIds,
  fragmentRef,
  onSelectTask,
}: BaseSingleWorkflowViewProps) {
  const data = useFragment(BaseSingleWorkflowViewFragment, fragmentRef);

  const fetchedTasks = useFetchedTasks(data ?? null);

  // Task selected for log viewer
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  const [filledTaskId, setFilledTaskId] = useState<string | null>(null);

  // Resolve task name from id
  const selectedTask = useMemo(
    () => fetchedTasks.find((task) => task.id === selectedTaskId),
    [fetchedTasks, selectedTaskId],
  );

  const [selectedTaskIds, setSelectedTaskIds] = useSelectedTaskIds();

  // // Artifact hover highlight
  // const [
  //   filledTaskId,
  //   setFilledTaskId,
  // ] = useState<string | null>(null);

  const taskTree = useMemo(() => buildTaskTree(fetchedTasks), [fetchedTasks]);

  type TaskTreeNode = {
    id: string;
    children?: TaskTreeNode[];
  };

  const outputTaskIds = useMemo(() => {
    const newOutputTaskIds: string[] = [];

    const traverse = (tasks: TaskTreeNode[]): void => {
      const sortedTasks = [...tasks].sort((a, b) => a.id.localeCompare(b.id));

      sortedTasks.forEach((taskNode) => {
        const children = taskNode.children ?? [];

        if (children.length === 0) {
          if (!newOutputTaskIds.includes(taskNode.id)) {
            newOutputTaskIds.push(taskNode.id);
          }
          return;
        }

        traverse(children);
      });
    };

    traverse(taskTree as TaskTreeNode[]);

    return newOutputTaskIds;
  }, [taskTree]);

  const handleSelectOutput = () => {
    setSelectedTaskIds(outputTaskIds);
  };

  const handleSelectClear = () => {
    setSelectedTaskIds([]);
    setSelectedTaskId(null);
  };

  const onArtifactHover = useCallback((artifact: Artifact | null) => {
    setFilledTaskId(artifact ? artifact.parentTaskId : null);
  }, []);

  useEffect(() => {
    setSelectedTaskIds(taskIds ?? []);
  }, [taskIds, setSelectedTaskIds]);

  const artifactList: Artifact[] = useMemo(() => {
    const filteredTasks = selectedTaskIds.length
      ? selectedTaskIds
          .map((id) => fetchedTasks.find((task) => task.id === id))
          .filter((task): task is Task => !!task)
      : fetchedTasks;

    return filteredTasks.flatMap((task) => task.artifacts);
  }, [selectedTaskIds, fetchedTasks]);

  if (!data || !data.status) {
    return null;
  }

  return (
    <>
      <Box
        sx={{
          position: "relative",
          display: "inline-flex",
          alignItems: "flex-start",
          width: "100%",
          height: "100%",
        }}
      >
        <Box
          sx={{
            display: "flex",
            flexDirection: "row",
            width: "100%",
            height: "100%",
            gap: 2,
          }}
        >
          <Box
            display="flex"
            flexDirection="column"
            gap={1}
            sx={{
              position: "absolute",
              left: "-100px",
            }}
          >
            <ToggleButton
              value="output"
              aria-label="output"
              onClick={handleSelectOutput}
            >
              OUTPUT
            </ToggleButton>

            <ToggleButton
              value="clear"
              aria-label="clear"
              onClick={handleSelectClear}
            >
              CLEAR
            </ToggleButton>
          </Box>

          <BaseWorkflowRelay
            fragmentRef={data}
            workflowLink
            filledTaskId={filledTaskId}
            expanded={true}
            onSelectTask={(taskId) => {
              console.log("BASE SINGLE TASK SELECTED:", taskId);

              setSelectedTaskId(taskId);

              onSelectTask?.(taskId);
            }}
          />
        </Box>
      </Box>

      <TaskLogViewer
        visit={data.visit}
        workflowName={data.name}
        selectedTaskId={selectedTaskId}
        selectedTaskName={selectedTask?.name}
      />

      {taskIds && (
        <TaskInfo
          artifactList={artifactList}
          onArtifactHover={onArtifactHover}
        />
      )}

      <WorkflowInfo fragmentRef={data} />
    </>
  );
}
