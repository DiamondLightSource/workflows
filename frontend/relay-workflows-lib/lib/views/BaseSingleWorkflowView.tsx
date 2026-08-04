import { useCallback, useEffect, useMemo, useState } from "react";
import { Box, ToggleButton } from "@mui/material";
import {
  Artifact,
  Task,
  TaskNode,
  TaskInfo,
  buildTaskTree,
} from "workflows-lib";
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
}

export default function BaseSingleWorkflowView({
  taskIds,
  fragmentRef,
}: BaseSingleWorkflowViewProps) {

  const data = useFragment(
    BaseSingleWorkflowViewFragment,
    fragmentRef
  );

  const fetchedTasks = useFetchedTasks(data ?? null);

  const [
    selectedTaskIds,
    setSelectedTaskIds,
  ] = useSelectedTaskIds();

  const [
    filledTaskId,
    setFilledTaskId,
  ] = useState<string | null>(null);


  // The task currently opened in the log viewer
  const [
    selectedTaskId,
    setSelectedTaskId,
  ] = useState<string | null>(null);


  const taskTree = useMemo(
    () => buildTaskTree(fetchedTasks),
    [fetchedTasks]
  );


  const outputTaskIds: string[] = useMemo(() => {
    const newOutputTaskIds: string[] = [];

    const traverse = (tasks: TaskNode[]) => {
      const sortedTasks = [...tasks].sort(
        (a, b) => a.id.localeCompare(b.id)
      );

      sortedTasks.forEach((taskNode) => {

        if (
          taskNode.children &&
          taskNode.children.length === 0 &&
          !newOutputTaskIds.includes(taskNode.id)
        ) {
          newOutputTaskIds.push(taskNode.id);
        }

        else if (
          taskNode.children &&
          taskNode.children.length > 0
        ) {
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
    setSelectedTaskId(null);
  };


  const onArtifactHover = useCallback(
    (artifact: Artifact | null) => {
      setFilledTaskId(
        artifact
          ? artifact.parentTaskId
          : null
      );
    },
    []
  );


  useEffect(() => {
    setSelectedTaskIds(taskIds ?? []);
  }, [
    taskIds,
    setSelectedTaskIds,
  ]);



  const artifactList: Artifact[] = useMemo(() => {

    const filteredTasks = selectedTaskIds.length

      ? selectedTaskIds
          .map((id) =>
            fetchedTasks.find(
              (task) => task.id === id
            )
          )
          .filter(
            (task): task is Task =>
              !!task
          )

      : fetchedTasks;


    return filteredTasks.flatMap(
      (task) => task.artifacts
    );

  }, [
    selectedTaskIds,
    fetchedTasks,
  ]);



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
            onSelectTask={setSelectedTaskId}
            
          />


        </Box>

      </Box>



      {taskIds && (
        <TaskInfo
          artifactList={artifactList}
          onArtifactHover={onArtifactHover}
        />
      )}



      {/* <TaskLogViewer
        visit={data.visit}
        workflowName={data.name}
        selectedTaskId={selectedTaskId}
      /> */}



      <WorkflowInfo fragmentRef={data} />

    </>
  );
}