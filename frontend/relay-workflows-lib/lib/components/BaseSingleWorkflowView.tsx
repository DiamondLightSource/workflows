import { useCallback, useEffect, useMemo, useState } from "react";
import { Box, ToggleButton } from "@mui/material";
import { TaskInfo } from "workflows-lib/lib/components/workflow/TaskInfo";
import { buildTaskTree } from "workflows-lib/lib/utils/tasksFlowUtils";
import { Artifact, Task, TaskNode } from "workflows-lib/lib/types";
import { useFetchedTasks, useSelectedTaskIds } from "./workflowRelayUtils";
import WorkflowInfo from "./WorkflowInfo";
import { workflowRelaySubscription$data } from "../graphql/__generated__/workflowRelaySubscription.graphql";
import WorkflowRelay from "./WorkflowRelay";

interface BaseSingleWorkflowViewProps {
  data: workflowRelaySubscription$data | null;
  taskIds?: string[];
}

export default function BaseSingleWorkflowView({
  taskIds,
  data,
}: BaseSingleWorkflowViewProps) {
  const [artifactList, setArtifactList] = useState<Artifact[]>([]);
  const [outputTaskIds, setOutputTaskIds] = useState<string[]>([]);
  const fetchedTasks = useFetchedTasks(data);
  const [selectedTaskIds, setSelectedTaskIds] = useSelectedTaskIds();
  const [filledTaskId, setFilledTaskId] = useState<string | null>(null);

  const taskTree = useMemo(() => buildTaskTree(fetchedTasks), [fetchedTasks]);

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

  useEffect(() => {
    const filteredTasks = selectedTaskIds.length
      ? selectedTaskIds
          .map((id) => fetchedTasks.find((task) => task.id === id))
          .filter((task): task is Task => !!task)
      : fetchedTasks;
    setArtifactList(filteredTasks.flatMap((task) => task.artifacts));
  }, [selectedTaskIds, fetchedTasks]);

  useEffect(() => {
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
    setOutputTaskIds(newOutputTaskIds);
  }, [taskTree]);

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
          {data && (
            <WorkflowRelay
              data={data}
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
      {data && <WorkflowInfo workflow={data.workflow} />}
    </>
  );
}
