import { useFragment } from "react-relay";
import { graphql } from "react-relay";
import { WorkflowAccordion } from "workflows-lib";
import type { WorkflowStatus, Task } from "workflows-lib";
import { WorkflowRelayFragment$key } from "./__generated__/WorkflowRelayFragment.graphql";

const WorkflowRelay = (props: { workflow: WorkflowRelayFragment$key }) => {
  const workflowFragment = graphql`
    fragment WorkflowRelayFragment on Workflow {
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
            status
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
            status
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
            status
          }
        }
        ... on WorkflowRunningStatus {
          message
          startTime
          tasks {
            id
            name
            depends
            status
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

  const statusText = statusTextMap[data.status.__typename];

  const tasks =
    "tasks" in data.status && Array.isArray(data.status.tasks)
      ? data.status.tasks.map((task: Task) => ({
          id: task.id,
          name: task.name,
          depends: task.depends ? [...task.depends] : [],
          status: task.status,
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
