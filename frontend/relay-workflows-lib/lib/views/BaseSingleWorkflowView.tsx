import { useCallback, useEffect, useMemo, useState } from "react";
import { Box, ToggleButton } from "@mui/material";
import { TaskInfo } from "workflows-lib/lib/components/workflow/TaskInfo";
import { buildTaskTree } from "workflows-lib/lib/utils/tasksFlowUtils";
import { Artifact, Task, TaskNode } from "workflows-lib/lib/types";
import {
  useFetchedTasks,
  useSelectedTaskIds,
} from "../utils/workflowRelayUtils";
import WorkflowInfo from "../components/WorkflowInfo";
import { useFragment } from "react-relay";
import { graphql } from "react-relay";
import { BaseSingleWorkflowViewFragment$key } from "./__generated__/BaseSingleWorkflowViewFragment.graphql";
import BaseWorkflowRelay from "../components/BaseWorkflowRelay";

export const BaseSingleWorkflowViewFragment = graphql`
  fragment BaseSingleWorkflowViewFragment on Workflow @relay(mask: false) {
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
}

export default function BaseSingleWorkflowView({
  taskIds,
  fragmentRef,
}: BaseSingleWorkflowViewProps) {
  const data = useFragment(BaseSingleWorkflowViewFragment, fragmentRef);
  const fetchedTasks = useFetchedTasks(data ?? null);
  const [selectedTaskIds, setSelectedTaskIds] = useSelectedTaskIds();
  const [filledTaskId, setFilledTaskId] = useState<string | null>(null);

  const taskTree = useMemo(() => buildTaskTree(fetchedTasks), [fetchedTasks]);

  const outputTaskIds: string[] = useMemo(() => {
    const newOutputTaskIds: string[] = [];
    const traverse = (tasks: TaskNode[]) => {
      const sortedTasks = [...tasks].sort((a, b) => a.id.localeCompare(b.id));
      sortedTasks.forEach((taskNode) => {
        if (
          taskNode.children &&
          taskNode.children.length === 0 &&
          !newOutputTaskIds.includes(taskNode.id)
        ) {
          newOutputTaskIds.push(taskNode.id);
        } else if (taskNode.children && taskNode.children.length > 0) {
          traverse(taskNode.children);
        }
      });
    };
    traverse(taskTree);
    return newOutputTaskIds;
  }, [taskTree]);

  const handleSelectOutput = () => {
    setSelectedTaskIds(outputTaskIds);
  };

  const handleSelectClear = () => {
    setSelectedTaskIds([]);
  };

  const onArtifactHover = useCallback(
    (artifact: Artifact | null) => {
      setFilledTaskId(artifact ? artifact.parentTaskId : null);
    },
    [setFilledTaskId],
  );

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
            sx={{ position: "absolute", left: "-100px" }}
          >
            <ToggleButton
              value="output"
              aria-label="output"
              onClick={handleSelectOutput}
            >
              OUTPUT
            </ToggleButton>
            <ToggleButton
              value="output"
              aria-label="output"
              onClick={handleSelectClear}
            >
              CLEAR
            </ToggleButton>
          </Box>

          {fragmentRef && (
            <BaseWorkflowRelay
              fragmentRef={data}
              workflowLink
              filledTaskId={filledTaskId}
              expanded={true}
            />
          )}
        </Box>
      </Box>
      {taskIds && (
        <TaskInfo
          artifactList={artifactList}
          onArtifactHover={onArtifactHover}
        />
      )}
      {<WorkflowInfo fragmentRef={data} />}
    </>
  );
}
