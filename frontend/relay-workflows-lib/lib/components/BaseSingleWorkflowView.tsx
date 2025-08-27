import { useCallback, useEffect, useMemo, useState } from "react";
import { Box, ToggleButton } from "@mui/material";
import { TaskInfo } from "workflows-lib/lib/components/workflow/TaskInfo";
import { buildTaskTree } from "workflows-lib/lib/utils/tasksFlowUtils";
import { Artifact, Task, TaskNode } from "workflows-lib/lib/types";
import { useFetchedTasks, useSelectedTasks } from "./workflowRelayUtils";
import WorkflowInfo from "./WorkflowInfo";
import { workflowRelaySubscription$data } from "../graphql/__generated__/workflowRelaySubscription.graphql";
import WorkflowRelay from "./WorkflowRelay";

interface BaseSingleWorkflowViewProps {
  data: workflowRelaySubscription$data | null;
  tasknames?: string[];
}

export default function BaseSingleWorkflowView({
  tasknames,
  data,
}: BaseSingleWorkflowViewProps) {
  const [artifactList, setArtifactList] = useState<Artifact[]>([]);
  const [outputTasks, setOutputTasks] = useState<string[]>([]);
  const fetchedTasks = useFetchedTasks(data);
  const [selectedTasks, setSelectedTasks] = useSelectedTasks();
  const [filledTaskName, setFilledTaskName] = useState<string | null>(null);

  const taskTree = useMemo(() => buildTaskTree(fetchedTasks), [fetchedTasks]);

  const handleSelectOutput = () => {
    setSelectedTasks(outputTasks);
  };

  const handleSelectClear = () => {
    setSelectedTasks([]);
  };

  const onArtifactHover = useCallback(
    (artifact: Artifact | null) => {
      setFilledTaskName(artifact ? artifact.parentTask : null);
    },
    [setFilledTaskName],
  );

  useEffect(() => {
    setSelectedTasks(tasknames ?? []);
  }, [tasknames, setSelectedTasks]);

  useEffect(() => {
    const filteredTasks = selectedTasks.length
      ? selectedTasks
          .map((name) => fetchedTasks.find((task) => task.name === name))
          .filter((task): task is Task => !!task)
      : fetchedTasks;
    setArtifactList(filteredTasks.flatMap((task) => task.artifacts));
  }, [selectedTasks, fetchedTasks]);

  useEffect(() => {
    const newOutputTasks: string[] = [];
    const traverse = (tasks: TaskNode[]) => {
      const sortedTasks = [...tasks].sort((a, b) =>
        a.name.localeCompare(b.name),
      );
      sortedTasks.forEach((taskNode) => {
        if (
          taskNode.children &&
          taskNode.children.length === 0 &&
          !newOutputTasks.includes(taskNode.name)
        ) {
          newOutputTasks.push(taskNode.name);
        } else if (taskNode.children && taskNode.children.length > 0) {
          traverse(taskNode.children);
        }
      });
    };
    traverse(taskTree);
    setOutputTasks(newOutputTasks);
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
              filledTaskName={filledTaskName}
              expanded={true}
            />
          )}
        </Box>
      </Box>
      {tasknames && (
        <TaskInfo
          artifactList={artifactList}
          onArtifactHover={onArtifactHover}
        />
      )}
      {data && <WorkflowInfo workflow={data.workflow} />}
    </>
  );
}
