import { useEffect, useMemo, useState } from "react";
import { useLazyLoadQuery } from "react-relay";
import { TaskInfo } from "workflows-lib/lib/components/workflow/TaskInfo";
import { Artifact, Task, TaskNode } from "workflows-lib/lib/types";
import WorkflowRelay, { workflowRelayQuery } from "./WorkflowRelay";
import { Visit } from "@diamondlightsource/sci-react-ui";
import { WorkflowRelayQuery as WorkflowRelayQueryType } from "./__generated__/WorkflowRelayQuery.graphql";
import { Box, ToggleButton } from "@mui/material";
import { buildTaskTree } from "workflows-lib/lib/utils/tasksFlowUtils";
import { useFetchedTasks, useSelectedTasks } from "./workflowRelayUtils";

interface SingleWorkflowViewProps {
  visit: Visit;
  workflowName: string;
  tasknames?: string[];
}

export default function SingleWorkflowView({
  visit,
  workflowName,
  tasknames,
}: SingleWorkflowViewProps) {
  const data = useLazyLoadQuery<WorkflowRelayQueryType>(workflowRelayQuery, {
    visit: visit,
    name: workflowName,
  });

  const [artifactList, setArtifactList] = useState<Artifact[]>([]);
  const [outputTasks, setOutputTasks] = useState<string[]>([]);
  const fetchedTasks = useFetchedTasks(data, visit, workflowName);
  const [selectedTasks, setSelectedTasks] = useSelectedTasks();

  const taskTree = useMemo(() => buildTaskTree(fetchedTasks), [fetchedTasks]);

  const handleSelectOutput = () => {
    setSelectedTasks(outputTasks);
  };

  const handleSelectClear = () => {
    setSelectedTasks([]);
  };

  useEffect(() => {
    setSelectedTasks(tasknames ? tasknames : []);
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
        a.name.localeCompare(b.name)
      );
      sortedTasks.forEach((taskNode) => {
        if (
          taskNode.children &&
          taskNode.children.length == 0 &&
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

          <WorkflowRelay
            workflowName={data.workflow.name}
            visit={data.workflow.visit}
            workflowLink
            expanded={true}
          />
        </Box>
      </Box>
      {tasknames && (
        <div style={{ width: "100%", marginTop: "1rem" }}>
          <TaskInfo artifactList={artifactList} />
        </div>
      )}
    </>
  );
}
