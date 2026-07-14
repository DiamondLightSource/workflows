import { useEffect, useRef, useState } from "react";
import {
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Typography,
  Box,
  IconButton,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import PushPinIcon from "@mui/icons-material/PushPin";
import PushPinOutlinedIcon from "@mui/icons-material/PushPinOutlined";

import { useArgoLogs, LogEntry } from "../hooks/useArgoLogs";

type Props = {
  visit: {
    proposalCode: string;
    proposalNumber: number;
    number: number;
  };
  workflowName: string;
  taskIds: string[];
  taskLabels: Record<string, string>;
};

type TaskState = {
  open: boolean;
  pinned: boolean;
  logs: LogEntry[];
};

export default function WorkflowLogsAccordion({
  visit,
  workflowName,
  taskIds,
  taskLabels,
}: Props) {
  const [state, setState] = useState<Record<string, TaskState>>({});

  // DEBUG
  useEffect(() => {
    console.log(
      "[WorkflowLogsAccordion] mounted",
    );

    return () => {
      console.log(
        "[WorkflowLogsAccordion] unmounted",
      );
    };
  }, []);

  // DEBUG
  useEffect(() => {
    console.log(
      "[WorkflowLogsAccordion] taskIds:",
      taskIds,
    );
  }, [taskIds]);

  // DEBUG
  useEffect(() => {
    console.log(
      "[WorkflowLogsAccordion] state keys:",
      Object.keys(state),
    );
  }, [state]);

  // ensure task buckets exist
  useEffect(() => {
    setState((prev) => {
      const next = { ...prev };

      for (const id of taskIds) {
        if (!next[id]) {
          next[id] = {
            open: true,
            pinned: false,
            logs: [],
          };
        }
      }

      return next;
    });
  }, [taskIds]);

  return (
    <Box sx={{ width: "100%" }}>
      {taskIds.map((taskId) => (
        <TaskLogPanel
          key={taskId}
          visit={visit}
          workflowName={workflowName}
          taskId={taskId}
          taskLabel={
            taskLabels?.[taskId] ??
            "Loading..."
          }
          state={state[taskId]}
          onToggleOpen={() => {
            setState((prev) => ({
              ...prev,
              [taskId]: {
                ...prev[taskId],
                open: !prev[taskId]?.open,
              },
            }));
          }}
          onTogglePin={() => {
            setState((prev) => ({
              ...prev,
              [taskId]: {
                ...prev[taskId],
                pinned:
                  !prev[taskId]?.pinned,
              },
            }));
          }}
          onAppendLog={(log: LogEntry) => {
            setState((prev) => {
              const curr =
                prev[taskId] ?? {
                  open: true,
                  pinned: false,
                  logs: [],
                };

              return {
                ...prev,
                [taskId]: {
                  ...curr,
                  logs: [
                    ...curr.logs,
                    log,
                  ],
                },
              };
            });
          }}
        />
      ))}
    </Box>
  );
}

function TaskLogPanel({
  visit,
  workflowName,
  taskId,
  taskLabel,
  state,
  onToggleOpen,
  onTogglePin,
  onAppendLog,
}: {
  visit: any;
  workflowName: string;
  taskId: string;
  taskLabel: string;
  state?: TaskState;
  onToggleOpen: () => void;
  onTogglePin: () => void;
  onAppendLog: (
    log: LogEntry,
  ) => void;
}) {
  const containerRef =
    useRef<HTMLDivElement | null>(
      null,
    );

  const { logs } = useArgoLogs({
    visit,
    workflowName,
    taskId,
    enabled: true,
  });

  const isOpen =
    state?.open ?? true;

  const isPinned =
    state?.pinned ?? false;

  const storedLogs =
    state?.logs ?? [];

  const lastIndex =
    useRef(0);

  // DEBUG
  useEffect(() => {
    console.log(
      `[TaskLogPanel] mounted ${taskId}`,
    );

    return () => {
      console.log(
        `[TaskLogPanel] unmounted ${taskId}`,
      );
    };
  }, []);

  // DEBUG
  useEffect(() => {
    console.log(
      `[TaskLogPanel] ${taskId} stored logs:`,
      storedLogs.length,
    );
  }, [storedLogs, taskId]);

  // append only new logs
  useEffect(() => {
    for (
      let i =
        lastIndex.current;
      i < logs.length;
      i++
    ) {
      const log: LogEntry =
        logs[i];

      onAppendLog(log);
    }

    lastIndex.current =
      logs.length;
  }, [
    logs,
    onAppendLog,
  ]);

  // auto scroll
  useEffect(() => {
    if (
      !isOpen ||
      isPinned
    ) {
      return;
    }

    const el =
      containerRef.current;

    if (!el) {
      return;
    }

    const distance =
      el.scrollHeight -
      el.scrollTop -
      el.clientHeight;

    if (
      distance < 80
    ) {
      el.scrollTop =
        el.scrollHeight;
    }
  }, [
    storedLogs,
    isOpen,
    isPinned,
  ]);

  return (
    <Accordion
      expanded={isOpen}
      onChange={
        onToggleOpen
      }
    >
      <AccordionSummary
        expandIcon={
          <ExpandMoreIcon />
        }
      >
        <Typography
          sx={{
            flex: 1,
          }}
        >
          Task Logs:
          {" "}
          {taskLabel}
        </Typography>

        <IconButton
          onClick={(e) => {
            e.stopPropagation();
            onTogglePin();
          }}
        >
          {isPinned ? (
            <PushPinIcon />
          ) : (
            <PushPinOutlinedIcon />
          )}
        </IconButton>
      </AccordionSummary>

      <AccordionDetails>
        <Box
          ref={
            containerRef
          }
          sx={{
            fontFamily:
              "monospace",
            fontSize: 12,
            maxHeight: 300,
            overflowY:
              "auto",
          }}
        >
          {storedLogs.map(
            (
              l: LogEntry,
              i: number,
            ) => (
              <div key={i}>
                {
                  l.content
                }
              </div>
            ),
          )}
        </Box>
      </AccordionDetails>
    </Accordion>
  );
}