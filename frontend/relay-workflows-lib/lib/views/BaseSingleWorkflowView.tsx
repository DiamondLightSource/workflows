import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

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
import WorkflowLogsAccordion from "../components/WorkflowLogsAccordion";

import {
  graphql,
  useFragment,
} from "react-relay";

import {
  BaseSingleWorkflowViewFragment$key,
} from "./__generated__/BaseSingleWorkflowViewFragment.graphql";

import BaseWorkflowRelay from "../components/BaseWorkflowRelay";


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
    fragmentRef,
  );


  const fetchedTasks = useFetchedTasks(
    data ?? null,
  );


  const [
    selectedTaskIds,
    setSelectedTaskIds,
  ] = useSelectedTaskIds();


  const [
    filledTaskId,
    setFilledTaskId,
  ] = useState<string | null>(null);


  // -------- LOG STATE --------

  const [
    openedTaskIds,
    setOpenedTaskIds,
  ] = useState<string[]>([]);


  const [
    taskLabels,
    setTaskLabels,
  ] = useState<Record<string, string>>({});



  // -------- OUTPUT TASKS --------

  const taskTree = useMemo(
    () => buildTaskTree(fetchedTasks),
    [fetchedTasks],
  );


  const outputTaskIds = useMemo(() => {

    const result: string[] = [];


    const traverse = (
      tasks: TaskNode[],
    ) => {

      const sorted = [...tasks].sort(
        (a, b) =>
          a.id.localeCompare(b.id),
      );


      sorted.forEach((taskNode) => {

        if (
          taskNode.children &&
          taskNode.children.length === 0
        ) {

          if (!result.includes(taskNode.id)) {
            result.push(taskNode.id);
          }

        } else if (
          taskNode.children &&
          taskNode.children.length > 0
        ) {

          traverse(taskNode.children);

        }

      });

    };


    traverse(taskTree);

    return result;

  }, [taskTree]);



  const handleSelectOutput = () => {
    setSelectedTaskIds(outputTaskIds);
  };


  const handleSelectClear = () => {
    setSelectedTaskIds([]);
  };



  const onArtifactHover = useCallback(
    (artifact: Artifact | null) => {

      setFilledTaskId(
        artifact
          ? artifact.parentTaskId
          : null,
      );

    },
    [],
  );



  useEffect(() => {

    setSelectedTaskIds(
      taskIds ?? [],
    );

  }, [
    taskIds,
    setSelectedTaskIds,
  ]);



  const artifactList = useMemo(
    (): Artifact[] => {

      const filteredTasks =
        selectedTaskIds.length

          ? selectedTaskIds
              .map(
                id =>
                  fetchedTasks.find(
                    task =>
                      task.id === id,
                  ),
              )
              .filter(
                (task): task is Task =>
                  !!task,
              )

          : fetchedTasks;


      return filteredTasks.flatMap(
        task =>
          task.artifacts,
      );

    },
    [
      selectedTaskIds,
      fetchedTasks,
    ],
  );



  if (!data || !data.status) {
    return null;
  }



  return (

    <>

      {/* GRAPH */}

      <Box
        sx={{
          position: "relative",
          display: "inline-flex",
          width: "100%",
          height: "100%",
        }}
      >

        <Box
          sx={{
            display: "flex",
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



          {fragmentRef && (

            <BaseWorkflowRelay
              fragmentRef={data}
              workflowLink
              filledTaskId={filledTaskId}
              expanded

              onSelectTask={
                (
                  taskId: string,
                  taskLabel?: string,
                ) => {

                  setOpenedTaskIds(
                    previous =>
                      previous.includes(taskId)
                        ? previous
                        : [
                            ...previous,
                            taskId,
                          ],
                  );


                  if (taskLabel) {

                    setTaskLabels(
                      previous => ({
                        ...previous,
                        [taskId]: taskLabel,
                      }),
                    );

                  }

                }
              }

            />

          )}

        </Box>

      </Box>



      {/* S3 / ARTIFACT OUTPUT */}

      {taskIds && (

        <TaskInfo
          artifactList={artifactList}
          onArtifactHover={onArtifactHover}
        />

      )}



      {/* WORKFLOW DETAILS */}

      <WorkflowInfo
        fragmentRef={data}
      />



      {/* LIVE POD LOGS */}

      {openedTaskIds.length > 0 && (

        <Box
          sx={{
            mt: 2,
            borderTop:
              "1px solid rgba(0,0,0,0.1)",
            pt: 1,
            maxHeight: "40vh",
            overflowY: "auto",
          }}
        >

          <WorkflowLogsAccordion
            visit={data.visit}
            workflowName={data.name}
            taskIds={openedTaskIds}
            taskLabels={taskLabels}
          />

        </Box>

      )}

    </>

  );
}