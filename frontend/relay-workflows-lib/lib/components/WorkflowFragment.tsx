import { useFragment } from "react-relay";
import { graphql } from "react-relay";
import { WorkflowAccordion } from "workflows-lib";
import type { WorkflowStatus, TaskStatus } from "workflows-lib";
import { WorkflowFragment$key } from "./__generated__/WorkflowFragment.graphql";

const WorkflowRelay = (props: { workflow: WorkflowFragment$key }) => {
  const workflowFragment = graphql`
    fragment WorkflowFragment on Workflow {
      name
      status {
        __typename
        ... on WorkflowFailedStatus {
          message
          startTime
          endTime
          tasks {
            id
            name
            depends
          }
        }
        ... on WorkflowSucceededStatus {
          message
          startTime
          endTime
          tasks {
            id
            name
            depends
          }
        }
        ... on WorkflowPendingStatus {
          message
        }
        ... on WorkflowErroredStatus {
          message
          startTime
          endTime
          tasks {
            id
            name
            depends
          }
        }
        ... on WorkflowRunningStatus {
          message
          startTime
          tasks {
            id
            name
            depends
          }
        }
      }
    }
  `;

  const data = useFragment(workflowFragment, props.workflow);

  const statusTextMap: { [key: string]: WorkflowStatus } = {
    WorkflowPendingStatus: "Pending",
    WorkflowRunningStatus: "Running",
    WorkflowSucceededStatus: "Succeeded",
    WorkflowFailedStatus: "Failed",
    WorkflowErroredStatus: "Errored",
  };

  const statusText = statusTextMap[data.status.__typename] as WorkflowStatus;
  const tasks =
    "tasks" in data.status
      ? data.status.tasks.map((task) => ({
          id: task.id,
          name: task.name,
          depends: [...task.depends],
          status: task.status as TaskStatus,
        }))
      : [];

  return (
    <div>
      <WorkflowAccordion
        workflow={{
          name: data.name,
          status: statusText,
          tasks,
        }}
      />
    </div>
  );
};

export default WorkflowRelay;
