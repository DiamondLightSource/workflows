import { graphql, useLazyLoadQuery } from "react-relay";
import { ResizableBox } from "react-resizable";
import "react-resizable/css/styles.css";
import { Box } from "@mui/material";

import { TasksFlow, WorkflowAccordion } from "workflows-lib";
import type { Task, TaskStatus, WorkflowStatus } from "workflows-lib";
import { Visit } from "@diamondlightsource/sci-react-ui";
import { useNavigate, useParams } from "react-router-dom";
import RetriggerWorkflow from "./RetriggerWorkflow";
import { WorkflowRelayQuery as WorkflowRelayQueryType } from "./__generated__/WorkflowRelayQuery.graphql";
import { useEffect, useState } from "react";
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

  const navigate = useNavigate();

  const { visitid, tasknames, } = useParams<{
    visitid: string;
    tasknames?: string;
  }>();

  const statusText = data.workflow.status?.__typename ?? "Unknown";

  const [selectedTaskNames, setSelectedTaskNames] = useState<string[]>(highlightedTaskNames ?? [])

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
      const prev = tasknames? tasknames.split(","): []

      let updatedTasks: string[];
      
      if (isCtrl) {
        updatedTasks = prev.includes(taskName) ? prev.filter(name => name !== taskName) : [...prev, taskName];
      } else {
        updatedTasks = [taskName];
      }

      const basePath = `/workflows/${visitid || ""}/${workflowName || ""}`;
      const newPath = updatedTasks.length
        ? `${basePath}/${updatedTasks.join(",")}`
        : basePath;

      void navigate(newPath);

    }, [navigate, visitid, workflowName, tasknames])

  useEffect(() => {
    const taskList = tasknames? tasknames.split(","): []
    setSelectedTaskNames(taskList)
  }, [tasknames])
  
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
