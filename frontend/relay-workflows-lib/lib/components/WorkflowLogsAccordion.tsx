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
  const storageKey =
    `workflow-logs-${workflowName}`;

  const [state, setState] =
    useState<Record<string, TaskState>>(
      () => {

        const stored =
          sessionStorage.getItem(
            storageKey,
          );

        return stored
          ? JSON.parse(stored)
          : {};
      },
    );
  useEffect(() => {
    sessionStorage.setItem(
      storageKey,
      JSON.stringify(state),
    );
  }, [
    state,
    storageKey,
  ]);  

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
            taskId
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
              const current =
                prev[taskId] ?? {
                  open: true,
                  pinned: false,
                  logs: [],
                };

              return {
                ...prev,
                [taskId]: {
                  ...current,
                  logs: [
                    ...current.logs,
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
    useRef(
      storedLogs.length,
    );

  // append only new logs
  useEffect(() => {
    for (
      let i =
        lastIndex.current;
      i < logs.length;
      i++
    ) {
      onAppendLog(logs[i]);
    }

    lastIndex.current =
      logs.length;
  }, [
    logs,
    onAppendLog,
  ]);

  // terminal auto-scroll
  useEffect(() => {
    if (
      !containerRef.current ||
      isPinned
    ) {
      return;
    }

    containerRef.current.scrollTop =
      containerRef.current.scrollHeight;
  }, [
    storedLogs,
    isPinned,
  ]);

  return (
    <Accordion
      expanded={isOpen}
      onChange={onToggleOpen}
      disableGutters
      sx={{
        mb: 1,
        border:
          "1px solid #333",
        backgroundColor:
          "#111",
      }}
    >
      <AccordionSummary
        expandIcon={
          <ExpandMoreIcon
            sx={{
              color:
                "#00ff00",
            }}
          />
        }
        sx={{
          backgroundColor:
            "#1a1a1a",
          borderBottom:
            "1px solid #333",
          minHeight: 48,
        }}
      >
        <Typography
          sx={{
            flex: 1,
            color:
              "#00ff00",
            fontFamily:
              "monospace",
            fontWeight: 600,
          }}
        >
          $
          {" "}
          {taskLabel}
        </Typography>

        <IconButton
          onClick={(e) => {
            e.stopPropagation();
            onTogglePin();
          }}
          size="small"
        >
          {isPinned ? (
            <PushPinIcon
              sx={{
                color:
                  "#00ff00",
              }}
            />
          ) : (
            <PushPinOutlinedIcon
              sx={{
                color:
                  "#00ff00",
              }}
            />
          )}
        </IconButton>
      </AccordionSummary>

      <AccordionDetails
        sx={{
          p: 0,
          backgroundColor:
            "#000",
        }}
      >
        <Box
          ref={containerRef}
          sx={{
            backgroundColor: "#000",
            color: "#00ff00",

            fontFamily: `"Courier New", monospace`,
            fontSize: 12,
            lineHeight: 1.4,

            minHeight: "3cm",
            maxHeight: "6cm",
            height: "auto",

            overflowY: "auto",
            overflowX: "hidden",

            whiteSpace: "pre-wrap",
            wordBreak: "break-word",

            p: 1.5,

            display: "flex",
            flexDirection: "column",

            border: "1px solid #00aa00",

            boxShadow:
              "inset 0 0 10px rgba(0,255,0,0.15)",
          }}
        >
          {storedLogs.length ===
          0 ? (
            <Typography
              sx={{
                color:
                  "#008800",
                fontFamily:
                  "monospace",
                fontSize: 12,
              }}
            >
              Waiting for logs...
            </Typography>
          ) : (
            storedLogs.map(
              (
                log,
                index,
              ) => (
                <div
                  key={
                    index
                  }
                >
                  {
                    log.content
                  }
                </div>
              ),
            )
          )}
        </Box>
      </AccordionDetails>
    </Accordion>
  );
}