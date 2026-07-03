import { useEffect, useState } from "react";
import { Box, Button, Dialog, DialogContent, DialogTitle } from "@mui/material";

import BaseWorkflowRelay from "../components/BaseWorkflowRelay";
import { useArgoLogs } from "../hooks/useArgoLogs";

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

  if (!data) return null;

  const visit = data.visit;
  const workflowName = data.name;

  const { logs, error } = useArgoLogs({
    visit,
    workflowName,
    taskId: selectedTaskId,
    enabled: !!selectedTaskId,
  });
  
  useEffect(() => {
    // no-op safe (kept only if external control exists)
  }, [taskIds]);

  if (!data) return null;

  return (
    <>
      <Box sx={{ width: "100%", height: "100%" }}>
        <Button onClick={() => setSelectedTaskId(null)}>CLEAR</Button>

        <BaseWorkflowRelay
          fragmentRef={data}
          expanded
          filledTaskId={null}
          onSelectTask={setSelectedTaskId}
        />
      </Box>

      <Dialog
        open={!!selectedTaskId}
        onClose={() => setSelectedTaskId(null)}
        fullWidth
        maxWidth="md"
      >
        <DialogTitle>Logs: {selectedTaskId}</DialogTitle>

        <DialogContent>
          {error && <div style={{ color: "red" }}>{error}</div>}

          <pre style={{ whiteSpace: "pre-wrap" }}>
            {logs.map((l, i) => (
              <div key={i}>{l.content}</div>
            ))}
          </pre>
        </DialogContent>
      </Dialog>
    </>
  );
}