import React from "react";
import { Box } from "@mui/material";
import {
  WorkflowAccordion,
  type WorkflowStatus,
} from "workflows-lib";
import { visitToText } from "@diamondlightsource/sci-react-ui";
import { useSelectedTaskIds } from "../utils/workflowRelayUtils";
import {
  useNavigate,
  useParams,
} from "react-router-dom";
import { graphql } from "relay-runtime";
import { useFragment } from "react-relay";

import TasksFlow from "./TasksFlow";
import RetriggerWorkflow from "../query-components/RetriggerWorkflow";

import type {
  BaseWorkflowRelayFragment$key,
} from "./__generated__/BaseWorkflowRelayFragment.graphql";

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

interface Props {
  fragmentRef: BaseWorkflowRelayFragment$key | null;

  workflowLink?: boolean;

  expanded?: boolean;

  filledTaskId?: string | null;

  onSelectTask?: (
    taskId: string,
    taskLabel?: string,
  ) => void;

  onChange?: (
    event: React.SyntheticEvent,
    expanded: boolean,
  ) => void;
}

export default function BaseWorkflowRelay({
  fragmentRef,
  workflowLink,
  expanded,
  filledTaskId,
  onSelectTask,
  onChange,
}: Props) {
  const data = useFragment(
    BaseWorkflowRelayFragment,
    fragmentRef,
  );

  const navigate = useNavigate();

  const {
    workflowName: urlName,
  } = useParams<{
    workflowName: string;
  }>();

  const [
    selectedTaskIds,
    setSelectedTaskIds,
  ] = useSelectedTaskIds();

  const onNavigate =
    React.useCallback(
      (
        taskId: string,
        taskLabel?: string,
      ) => {
        console.log(
          "[BaseWorkflowRelay] task selected:",
          taskId,
          taskLabel,
        );

        setSelectedTaskIds([
          taskId,
        ]);

        onSelectTask?.(
          taskId,
          taskLabel,
        );

        if (
          urlName !== data.name
        ) {
          void navigate(
            `/workflows/${visitToText(
              data.visit,
            )}/${data.name}`,
          );
        }
      },
      [
        data,
        navigate,
        urlName,
        setSelectedTaskIds,
        onSelectTask,
      ],
    );

  return (
    <Box>
      <WorkflowAccordion
        workflow={{
          name: data.name,
          instrumentSession:
            data.visit,
          status:
            data.status
              .__typename as WorkflowStatus,
          creator:
            data.creator
              .creatorId,
        }}
        workflowLink={
          workflowLink
        }
        expanded={
          expanded
        }
        onChange={
          onChange
        }
        retriggerComponent={
          RetriggerWorkflow
        }
      >
        <TasksFlow
          workflowName={
            data.name
          }
          tasksRef={data}
          onNavigate={
            onNavigate
          }
          highlightedTaskIds={
            selectedTaskIds
          }
          filledTaskId={
            filledTaskId
          }
          onSelectTask={
            onSelectTask
          }
        />
      </WorkflowAccordion>
    </Box>
  );
}