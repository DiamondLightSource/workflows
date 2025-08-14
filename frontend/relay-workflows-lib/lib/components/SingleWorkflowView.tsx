import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useSubscription } from "react-relay";
import { GraphQLSubscriptionConfig } from "relay-runtime";
import { Box, ToggleButton } from "@mui/material";
import { Visit } from "@diamondlightsource/sci-react-ui";
import { TaskInfo } from "workflows-lib/lib/components/workflow/TaskInfo";
import { buildTaskTree } from "workflows-lib/lib/utils/tasksFlowUtils";
import { Artifact, Task, TaskNode } from "workflows-lib/lib/types";
import { useFetchedTasks, useSelectedTasks } from "./workflowRelayUtils";
import WorkflowRelay from "./WorkflowRelay";
import WorkflowInfo from "./WorkflowInfo";
import { workflowRelaySubscription } from "../graphql/workflowRelaySubscription";
import {
  workflowRelaySubscription$data,
  workflowRelaySubscription as WorkflowRelaySubscriptionType,
} from "../graphql/__generated__/workflowRelaySubscription.graphql";

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
  const [workflowData, setWorkflowData] =
    React.useState<workflowRelaySubscription$data | null>(null);

  const subscriptionData: GraphQLSubscriptionConfig<WorkflowRelaySubscriptionType> =
    useMemo(
      () => ({
        subscription: workflowRelaySubscription,
        variables: {
          visit,
          name: workflowName,
        },
        onNext: (res?: workflowRelaySubscription$data | null) => {
          setWorkflowData(res ?? null);
        },
        onError: () => {},
        onCompleted: () => {},
      }),
      [visit, workflowName],
    );

  useSubscription(subscriptionData);

  const [artifactList, setArtifactList] = useState<Artifact[]>([]);
  const [outputTasks, setOutputTasks] = useState<string[]>([]);
  const fetchedTasks = useFetchedTasks(workflowData, visit, workflowName);
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
        a.name.localeCompare(b.name),
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
          {workflowData && (
            <WorkflowRelay
              workflowName={workflowData.workflow.name}
              visit={workflowData.workflow.visit}
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
      {workflowData && <WorkflowInfo workflow={workflowData.workflow} />}
    </>
  );
}
