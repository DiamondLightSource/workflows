import React from "react";
import { Box } from "@mui/material";
import { WorkflowAccordion, type WorkflowStatus } from "workflows-lib";
import { visitToText } from "@diamondlightsource/sci-react-ui";
import { useSelectedTaskIds } from "../utils/workflowRelayUtils";
import { useNavigate, useParams } from "react-router-dom";
import { graphql } from "relay-runtime";
import { useFragment } from "react-relay";
import TasksFlow from "./TasksFlow";
import RetriggerWorkflow from "../query-components/RetriggerWorkflow";

export const BaseWorkflowRelayFragment = graphql`
  fragment BaseWorkflowRelayFragment on Workflow {
    name
    visit {
      proposalCode
      proposalNumber
      number
    }
    creator {
      creatorId
    }
    status {
      __typename
    }
    ...WorkflowTasksFragment
  }
`;

export default function BaseWorkflowRelay({
  fragmentRef,
  workflowLink,
  expanded,
  filledTaskId,
  onSelectTask,
  onChange,
}: any) {
  const data = useFragment(BaseWorkflowRelayFragment, fragmentRef);

  const navigate = useNavigate();
  const { workflowName: urlName } = useParams<{ workflowName: string }>();

  const [selectedTaskIds, setSelectedTaskIds] = useSelectedTaskIds();

  const statusText = data.status?.__typename ?? "Unknown";

  const onNavigate = React.useCallback(
    (taskId: string) => {
      setSelectedTaskIds([taskId]);
      onSelectTask?.(taskId);

      if (urlName !== data.name) {
        void navigate(`/workflows/${visitToText(data.visit)}/${data.name}`);
      }
    },
    [data, navigate, urlName, setSelectedTaskIds, onSelectTask]
  );

  return (
    <Box>
      <WorkflowAccordion
        workflow={{
          name: data.name,
          instrumentSession: data.visit,
          status: statusText as WorkflowStatus,
          creator: data.creator.creatorId,
        }}
        workflowLink={workflowLink}
        expanded={expanded}
        onChange={onChange}
        retriggerComponent={RetriggerWorkflow}
      >
        <TasksFlow
          workflowName={data.name}
          tasksRef={data}
          onNavigate={onNavigate}
          highlightedTaskIds={selectedTaskIds}
          filledTaskId={filledTaskId}
          onSelectTask={onSelectTask}
        />
      </WorkflowAccordion>
    </Box>
  );
}