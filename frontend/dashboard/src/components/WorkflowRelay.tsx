import { useFragment } from "react-relay";
import { graphql } from "react-relay";
import { ResizableBox } from "react-resizable";
import "react-resizable/css/styles.css";

import { TasksFlow, WorkflowAccordion } from "workflows-lib";
import type { Task, TaskStatus, WorkflowStatus } from "workflows-lib";
import { WorkflowRelayFragment$key } from "./__generated__/WorkflowRelayFragment.graphql";

const WorkflowRelay = (props: {
  workflow: WorkflowRelayFragment$key;
  children: React.ReactNode;
}) => {
  const workflowFragment = graphql`
    fragment WorkflowRelayFragment on Workflow {
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
            artifacts {
              name
              url
              mimeType
            }
          }
        }
      }
    }
  `;
  const data = useFragment(workflowFragment, props.workflow);

  const statusText = data.status?.__typename ?? "Unknown";

  let tasks: Task[] = [];
  if (data.status) {
    if ('tasks' in data.status) {
      tasks = data.status.tasks.map((task) => ({
        id: task.id,
        name: task.name,
        status: task.status as TaskStatus,
        depends: [...task.depends],
        artifacts: [...task.artifacts],
      }));
    }
  }

  return (
    <WorkflowAccordion
      workflow={{
        name: data.name,
        status: statusText as WorkflowStatus,
      }}
    >
      <ResizableBox
        width={1150}
        height={400}
        resizeHandles={["se"]}
        style={{
          border: "2px dashed #ccc",
          padding: "10px",
          overflow: "auto",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <TasksFlow tasks={tasks}></TasksFlow>
      </ResizableBox>
    </WorkflowAccordion>
  );
};

export default WorkflowRelay;
