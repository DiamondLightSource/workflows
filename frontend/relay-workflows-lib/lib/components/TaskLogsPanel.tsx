import React, { useEffect, useRef, useState } from "react";
import { Accordion, AccordionSummary, AccordionDetails, Typography, Box } from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { LogEntry } from "../hooks/useArgoLogs";
import { wsClient } from "../components/RelayEnvironment";

type Props = {
  visit: {
    proposalCode: string;
    proposalNumber: number;
    number: number;
  };
  workflowName: string;
  taskIds: string[];
};

export default function TaskLogsPanel({
  visit,
  workflowName,
  taskIds,
}: Props) {
  const [logsByTask, setLogsByTask] = useState<Record<string, LogEntry[]>>({});
  const [expanded, setExpanded] = useState<string | null>(null);

  const subscriptionsRef = useRef<Record<string, () => void>>({});

  useEffect(() => {
    // subscribe to each taskId
    taskIds.forEach((taskId) => {
      if (subscriptionsRef.current[taskId]) return;

      setLogsByTask((prev) => ({
        ...prev,
        [taskId]: prev[taskId] ?? [],
      }));

      const dispose = wsClient.subscribe(
        {
          query: `
            subscription Logs($visit: VisitInput!, $workflowName: String!, $taskId: String!) {
              logs(visit: $visit, workflowName: $workflowName, taskId: $taskId) {
                content
                podName
              }
            }
          `,
          variables: {
            visit,
            workflowName,
            taskId,
          },
        },
        {
          next: (res: any) => {
            const log = res?.data?.logs;
            if (!log) return;

            setLogsByTask((prev) => ({
              ...prev,
              [taskId]: [...(prev[taskId] ?? []), log],
            }));
          },
          error: (err: any) => {
            console.error("[TaskLogsPanel] error:", err);
          },
          complete: () => {
            // no-op: required sink callback
          },
        },
      );

      subscriptionsRef.current[taskId] = dispose;

      // auto-expand newest task
      setExpanded(taskId);
    });

    return () => {
      Object.values(subscriptionsRef.current).forEach((dispose) => dispose());
      subscriptionsRef.current = {};
    };
  }, [taskIds, visit, workflowName]);

  return (
    <Box mt={2}>
      {taskIds.map((taskId) => (
        <Accordion
          key={taskId}
          expanded={expanded === taskId}
          onChange={() =>
            setExpanded(expanded === taskId ? null : taskId)
          }
        >
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography fontWeight={600}>
              Task Logs: {taskId}
            </Typography>
          </AccordionSummary>

          <AccordionDetails>
            <Box
              sx={{
                fontFamily: "monospace",
                fontSize: 12,
                whiteSpace: "pre-wrap",
                maxHeight: 300,
                overflowY: "auto",
              }}
            >
              {(logsByTask[taskId] ?? []).map((l, i) => (
                <div key={i}>{l.content}</div>
              ))}
            </Box>
          </AccordionDetails>
        </Accordion>
      ))}
    </Box>
  );
}