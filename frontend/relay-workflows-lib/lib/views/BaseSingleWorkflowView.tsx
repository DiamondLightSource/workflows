import { useEffect, useState } from "react";
import { Box } from "@mui/material";

import BaseWorkflowRelay from "../components/BaseWorkflowRelay";
import WorkflowLogsAccordion from "../components/WorkflowLogsAccordion";

import { graphql, useFragment } from "react-relay";
import { BaseSingleWorkflowViewFragment$key } from "./__generated__/BaseSingleWorkflowViewFragment.graphql";

export const BaseSingleWorkflowViewFragment = graphql`
  fragment BaseSingleWorkflowViewFragment on Workflow {
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
  }
`;

interface Props {
  fragmentRef: BaseSingleWorkflowViewFragment$key | null;
  taskIds?: string[];
}

export default function BaseSingleWorkflowView({
  fragmentRef,
  taskIds,
}: Props) {
  const data = useFragment(BaseSingleWorkflowViewFragment, fragmentRef);

  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [openedTaskIds, setOpenedTaskIds] = useState<string[]>([]);
  const [taskLabels, setTaskLabels] = useState<Record<string, string>>({});

  if (!data) return null;

  const visit = data.visit;
  const workflowName = data.name;

  // merge external taskIds (DO NOT overwrite)
  useEffect(() => {
    if (!taskIds?.length) return;

    setOpenedTaskIds((prev) =>
      Array.from(new Set([...prev, ...taskIds])),
    );
  }, [taskIds]);

  // open clicked task accordion
  useEffect(() => {
    if (!selectedTaskId) return;

    setOpenedTaskIds((prev) =>
      prev.includes(selectedTaskId)
        ? prev
        : [...prev, selectedTaskId],
    );
  }, [selectedTaskId]);

  return (
    <Box sx={{ width: "100%", height: "100%", display: "flex", flexDirection: "column" }}>
      {/* GRAPH */}
      <Box sx={{ flex: 1, minHeight: 0 }}>
        <BaseWorkflowRelay
          fragmentRef={data}
          expanded
          filledTaskId={null}
          onSelectTask={(taskId: string, taskLabel?: string) => {
            setSelectedTaskId(taskId);

            // store label immediately
            if (taskLabel) {
              setTaskLabels((prev) => ({
                ...prev,
                [taskId]: taskLabel,
              }));
            }
          }}
        />
      </Box>

      {/* LOGS */}
      {openedTaskIds.length > 0 && (
        <Box
          sx={{
            mt: 2,
            borderTop: "1px solid rgba(0,0,0,0.1)",
            pt: 1,
            maxHeight: "40vh",
            overflowY: "auto",
          }}
        >
          <WorkflowLogsAccordion
            visit={visit}
            workflowName={workflowName}
            taskIds={openedTaskIds}
            taskLabels={taskLabels}
          />
        </Box>
      )}
    </Box>
  );
}