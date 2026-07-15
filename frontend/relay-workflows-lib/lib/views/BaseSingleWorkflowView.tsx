import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";


import {
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Typography,
} from "@mui/material";

import ExpandMoreIcon
  from "@mui/icons-material/ExpandMore";


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

import { useArgoLogs } from "../hooks/useArgoLogs";

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

/*
 * Invisible background collector.
 * Keeps logs flowing even when the task
 * is not visible in the UI.
 */
function BackgroundLogSubscription({
  visit,
  workflowName,
  taskId,
}: {
  visit: any;
  workflowName: string;
  taskId: string;
}) {
  useArgoLogs({
    visit,
    workflowName,
    taskId,
    enabled: true,
  });

  return null;
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

  /*
   * Persist opened log windows across refreshes.
   */
  const [
    openedTaskIds,
    setOpenedTaskIds,
  ] = useState<string[]>(() => {
    if (!data?.name) {
      return [];
    }

    const stored =
      sessionStorage.getItem(
        `workflow-opened-${data.name}`,
      );

    return stored
      ? JSON.parse(stored)
      : [];
  });

  useEffect(() => {
    if (!data?.name) {
      return;
    }

    sessionStorage.setItem(
      `workflow-opened-${data.name}`,
      JSON.stringify(
        openedTaskIds,
      ),
    );
  }, [
    openedTaskIds,
    data?.name,
  ]);

  const [
    taskLabels,
    setTaskLabels,
  ] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!fetchedTasks.length) {
      return;
    }

    setOpenedTaskIds(
      (previous) => {
        const validTaskIds =
          new Set(
            fetchedTasks.map(
              (task) =>
                task.id,
            ),
          );

        return previous.filter(
          (id) =>
            validTaskIds.has(
              id,
            ),
        );
      },
    );
  }, [fetchedTasks]);

  const taskTree = useMemo(
    () =>
      buildTaskTree(
        fetchedTasks,
      ),
    [fetchedTasks],
  );

  const outputTaskIds =
    useMemo(() => {
      const result: string[] =
        [];

      const traverse = (
        tasks: TaskNode[],
      ) => {
        const sorted = [
          ...tasks,
        ].sort(
          (a, b) =>
            a.id.localeCompare(
              b.id,
            ),
        );

        sorted.forEach(
          (
            taskNode,
          ) => {
            if (
              taskNode.children &&
              taskNode.children
                .length === 0
            ) {
              if (
                !result.includes(
                  taskNode.id,
                )
              ) {
                result.push(
                  taskNode.id,
                );
              }
            } else if (
              taskNode.children &&
              taskNode.children
                .length > 0
            ) {
              traverse(
                taskNode.children,
              );
            }
          },
        );
      };

      traverse(taskTree);

      return result;
    }, [taskTree]);

  const handleSelectOutput =
    () => {
      setSelectedTaskIds(
        outputTaskIds,
      );
    };

  const handleSelectClear =
    () => {
      setSelectedTaskIds([]);
    };

  const onArtifactHover =
    useCallback(
      (
        artifact:
          | Artifact
          | null,
      ) => {
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

  const artifactList =
    useMemo((): Artifact[] => {
      const filteredTasks =
        selectedTaskIds.length
          ? selectedTaskIds
              .map(
                (
                  id,
                ) =>
                  fetchedTasks.find(
                    (
                      task,
                    ) =>
                      task.id ===
                      id,
                  ),
              )
              .filter(
                (
                  task,
                ): task is Task =>
                  !!task,
              )
          : fetchedTasks;

      return filteredTasks.flatMap(
        (
          task,
        ) =>
          task.artifacts,
      );
    }, [
      selectedTaskIds,
      fetchedTasks,
    ]);

  if (
    !data ||
    !data.status
  ) {
    return null;
  }

  return (
    <>
      {/* Background log collection */}
      {fetchedTasks.map((task) => {
        const existingLogs =
          localStorage.getItem(
            `workflow-logs-${data.name}-${task.id}`,
          );

        /*
        * If logs already exist and workflow has completed,
        * avoid creating another websocket.
        */
        const workflowFinished =
          data.status?.__typename === "Succeeded" ||
          data.status?.__typename === "Failed" ||
          data.status?.__typename === "Error";

        if (
          workflowFinished &&
          existingLogs
        ) {
          return null;
        }

        return (
          <BackgroundLogSubscription
            key={task.id}
            visit={data.visit}
            workflowName={data.name}
            taskId={task.id}
          />
        );
      })}
      <Box
        sx={{
          position:
            "relative",
          display: "flex",
          width: "100%",
          height: "100%",
          flex: 1,
          minHeight: 0,
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
              position:
                "absolute",
              left:
                "-100px",
            }}
          >
            <ToggleButton
              value="output"
              aria-label="output"
              onClick={
                handleSelectOutput
              }
            >
              OUTPUT
            </ToggleButton>

            <ToggleButton
              value="clear"
              aria-label="clear"
              onClick={
                handleSelectClear
              }
            >
              CLEAR
            </ToggleButton>
          </Box>

          {fragmentRef && (
            <Box
              sx={{
                flex: 1,
                minWidth: 0,
                width:
                  "100%",
                height:
                  "100%",
              }}
            >
              <BaseWorkflowRelay
                fragmentRef={
                  data
                }
                workflowLink
                filledTaskId={
                  filledTaskId
                }
                expanded
                onSelectTask={(
                  taskId,
                  taskLabel,
                ) => {
                  setOpenedTaskIds(
                    (
                      previous,
                    ) => {
                      if (
                        previous.includes(
                          taskId,
                        )
                      ) {
                        return previous.filter(
                          (
                            id,
                          ) =>
                            id !==
                            taskId,
                        );
                      }

                      return [
                        ...previous,
                        taskId,
                      ];
                    },
                  );

                  if (
                    taskLabel
                  ) {
                    setTaskLabels(
                      (
                        previous,
                      ) => ({
                        ...previous,
                        [taskId]:
                          taskLabel,
                      }),
                    );
                  }
                }}
              />
            </Box>
          )}
        </Box>
      </Box>

      <TaskInfo
        artifactList={
          artifactList
        }
        onArtifactHover={
          onArtifactHover
        }
      />

      <WorkflowInfo
        fragmentRef={
          data
        }
      />

      {openedTaskIds.length > 0 && (
        <Accordion
          defaultExpanded
          sx={{
            mt: 2,
          }}
        >
          <AccordionSummary
            expandIcon={
              <ExpandMoreIcon />
            }
          >
            <Typography
              variant="h6"
            >
              Logs
              {" "}
              (
              {openedTaskIds.length}
              )
            </Typography>
          </AccordionSummary>

          <AccordionDetails>
            <WorkflowLogsAccordion
              visit={data.visit}
              workflowName={data.name}
              taskIds={openedTaskIds}
              taskLabels={taskLabels}
            />
          </AccordionDetails>
        </Accordion>
      )}
    </>
  );
}