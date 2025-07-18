import { graphql, useLazyLoadQuery } from "react-relay";
import { ResizableBox } from "react-resizable";
import "react-resizable/css/styles.css";
import { Box } from "@mui/material";

import { TasksFlow, WorkflowAccordion } from "workflows-lib";
import type { Task, TaskStatus, WorkflowStatus } from "workflows-lib";
import { Visit } from "@diamondlightsource/sci-react-ui";
import { useSearchParams } from "react-router-dom";
import RetriggerWorkflow from "./RetriggerWorkflow";
import { WorkflowRelayQuery as WorkflowRelayQueryType } from "./__generated__/WorkflowRelayQuery.graphql";
import { useEffect, useMemo, useState } from "react";
import React from "react";

export const workflowRelayQuery = graphql`
  query WorkflowRelayQuery($visit: VisitInput!, $name: String!) {
    workflow(visit: $visit, name: $name) {
      name
      visit {
        proposalCode
        proposalNumber
        number
      }
      status {
        __typename
        ... on WorkflowPendingStatus {
          message
        }
        ... on WorkflowRunningStatus {
          startTime
          message
          tasks {
            id
            name
            status
            depends
            dependencies
            stepType
            artifacts {
              name
              url
              mimeType
            }
          }
        }
        ... on WorkflowSucceededStatus {
          startTime
          endTime
          message
          tasks {
            id
            name
            status
            depends
            dependencies
            stepType
            artifacts {
              name
              url
              mimeType
            }
          }
        }
        ... on WorkflowFailedStatus {
          startTime
          endTime
          message
          tasks {
            id
            name
            status
            depends
            dependencies
            stepType
            artifacts {
              name
              url
              mimeType
            }
          }
        }
        ... on WorkflowErroredStatus {
          startTime
          endTime
          message
          tasks {
            id
            name
            status
            depends
            dependencies
            stepType
            artifacts {
              name
              url
              mimeType
            }
          }
        }
      }
    }
  }
`;

interface WorkflowRelayProps {
  visit: Visit;
  workflowName: string;
  highlightedTaskNames?: string[];
  workflowLink?: boolean;
  expanded?: boolean;
  onChange?: () => void;
}

const WorkflowRelay: React.FC<WorkflowRelayProps> = ({
  visit,
  workflowName,
  highlightedTaskNames,
  workflowLink,
  expanded,
  onChange,
}) => {
  const data = useLazyLoadQuery<WorkflowRelayQueryType>(workflowRelayQuery, {
    visit: visit,
    name: workflowName,
  });

  const [searchParams, setSearchParams] = useSearchParams();
  const statusText = data.workflow.status?.__typename ?? "Unknown";
  const [selectedTaskNames, setSelectedTaskNames] = useState<string[]>(highlightedTaskNames ?? [])

  const taskParam = searchParams.get("tasks")
  const tasknames = useMemo(() => {
    if (!taskParam) return [];
    try {
      return JSON.parse(taskParam) as string[];
    } catch {
      return [];
    }
  }, [taskParam]);

  useEffect(() => {
    setSelectedTaskNames(tasknames);
  }, [tasknames]);

  const tasks: Task[] =
    data.workflow.status && "tasks" in data.workflow.status
      ? data.workflow.status.tasks.map((task) => ({
          id: task.id,
          name: task.name,
          status: task.status as TaskStatus,
          depends: [...task.depends],
          artifacts: task.artifacts.map ((artifact) => ({
            ...artifact,
            parentTask: task.name
          })),
          workflow: data.workflow.name,
          instrumentSession: data.workflow.visit as Visit,
          stepType: task.stepType,
        }))
      : [];
  
  const onNavigate = React.useCallback(
    (path: string, event?: React.MouseEvent) => {
      const taskName = String(path.split("/").filter(Boolean).pop());
      const isCtrl = event?.ctrlKey || event?.metaKey;

      let updatedTasks: string[];
      
      if (isCtrl) {
        updatedTasks = tasknames.includes(taskName) ? tasknames.filter(name => name !== taskName) : [...tasknames, taskName];
      } else {
        updatedTasks = [taskName];
      }

      const params = new URLSearchParams(searchParams);
      if (updatedTasks.length > 0) {
        params.set("tasks", JSON.stringify(updatedTasks));
      } else {
        params.delete("tasks");
      }
      setSearchParams(params)
    }, [tasknames, searchParams, setSearchParams])
  
  return (
    <Box
      sx={{
        width: {
          xl: "100%",
          lg: "100%",
          md: "90%",
          sm: "80%",
          xs: "70%",
        },
        maxWidth: "1200px",
        height: "100%",
        mx: "auto",
      }}
    >
      <WorkflowAccordion
        workflow={{
          name: data.workflow.name,
          instrumentSession: data.workflow.visit as Visit,
          status: statusText as WorkflowStatus,
        }}
        workflowLink={workflowLink}
        expanded={expanded}
        onChange={onChange}
        retriggerComponent={RetriggerWorkflow}
      >
        <ResizableBox
          width={Infinity}
          height={200}
          resizeHandles={["se"]}
          style={{
            width: "100%",
            maxWidth: "1150px",
            minWidth: "300px",
            padding: "10px",
            overflow: "auto",
            border: "2px dashed #ccc",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <TasksFlow
            workflowName={data.workflow.name}
            tasks={tasks}
            highlightedTaskNames={selectedTaskNames}
            onNavigate={onNavigate}
          ></TasksFlow>
        </ResizableBox>
      </WorkflowAccordion>
    </Box>
  );
};

export default WorkflowRelay;
