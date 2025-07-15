import { useEffect, useMemo, useState } from "react";
import { useLazyLoadQuery } from "react-relay";
import { TaskInfo } from "workflows-lib/lib/components/workflow/TaskInfo";
import { Artifact, Task, TaskNode, TaskStatus } from "workflows-lib/lib/types";
import WorkflowRelay, { workflowRelayQuery } from "./WorkflowRelay";
import { isWorkflowWithTasks } from "../utils";
import { Visit } from "@diamondlightsource/sci-react-ui";
import { WorkflowRelayQuery as WorkflowRelayQueryType } from "./__generated__/WorkflowRelayQuery.graphql";
import { Box, ToggleButton } from "@mui/material";
import { buildTaskTree } from "workflows-lib/lib/utils/tasksFlowUtils";

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
  const [outputSelected, setOutputSelected] = useState<boolean>(false);
  const [outputTasks, setOutputTasks] = useState<string[]>([]);
  const [selectedTasks, setSelectedTasks] = useState<string[]>([]);
  const [fetchedTasks, setFetchedTasks] = useState<Task[]>([]);

  const taskTree = useMemo(() => buildTaskTree(fetchedTasks), [fetchedTasks]);

  const handleSelectOutput = () => {
    setOutputSelected(!outputSelected);
  };

  useEffect(() => {
    if (data.workflow.status && isWorkflowWithTasks(data.workflow.status)) {
      setFetchedTasks(
        data.workflow.status.tasks.map((task) => ({
          id: task.id,
          name: task.name,
          status: task.status as TaskStatus,
          depends: [...task.depends],
          artifacts: task.artifacts.map((artifact) => ({
            ...artifact,
            parentTask: task.name,
            key: `${task.name}-${artifact.name}`,
          })),
          workflow: workflowName,
          instrumentSession: visit,
          stepType: task.stepType,
        }))
      );
    }
  }, [data.workflow.status]);

  useEffect(() => {
    const filteredTasks = selectedTasks?.length
      ? selectedTasks
          .map((name) => fetchedTasks.find((task) => task.name === name))
          .filter((task): task is Task => !!task)
      : fetchedTasks;
    setArtifactList(filteredTasks.flatMap((task) => task.artifacts));
  }, [selectedTasks, fetchedTasks]);

  useEffect(() => {
    let newOutputTasks: string[] = [];
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

  useEffect(() => {
    if (outputSelected) {
      setSelectedTasks(outputTasks);
    } else {
      setSelectedTasks(tasknames ? tasknames : []);
    }
  }, [outputTasks, outputSelected, tasknames]);

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
          <ToggleButton
            value="output"
            aria-label="output"
            selected={outputSelected}
            onClick={handleSelectOutput}
            sx={{ position: "absolute", left: "-100px" }}
          >
            OUTPUT
          </ToggleButton>
          <WorkflowRelay
            key={workflowName}
            visit={visit}
            workflowName={workflowName}
            fetchedTasks={fetchedTasks}
            workflowLink
            expanded={true}
            highlightedTaskNames={selectedTasks}
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
