import { useEffect, useMemo, useRef, useState } from "react";
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

import { useArgoLogs, type LogEntry } from "../hooks/useArgoLogs";

type VisitInfo = {
  proposalCode: string;
  proposalNumber: number;
  number: number;
};

type Props = {
  visit: VisitInfo;
  workflowName: string;
  taskIds: string[];
  taskLabels: Record<string, string>;
  taskStatuses: Record<string, string>;
};

type TaskState = {
  open: boolean;
  pinned: boolean;
  logs: LogEntry[];
  label: string;
};

export default function WorkflowLogsAccordion({
  visit,
  workflowName,
  taskIds,
  taskLabels,
  taskStatuses,
}: Props) {
  const storageKey = `workflow-logs-${workflowName}`;

  const [storedState, setStoredState] = useState<Record<string, TaskState>>(
    () => {
      const stored = sessionStorage.getItem(storageKey);

      if (!stored) {
        return {};
      }

      try {
        return JSON.parse(stored) as Record<string, TaskState>;
      } catch {
        return {};
      }
    },
  );

  useEffect(() => {
    sessionStorage.setItem(storageKey, JSON.stringify(storedState));
  }, [storedState, storageKey]);

  const state = useMemo<Record<string, TaskState>>(() => {
    const next = { ...storedState };

    for (const taskId of taskIds) {
      if (!(taskId in next)) {
        next[taskId] = {
          open: true,
          pinned: false,
          logs: [],
          label: taskLabels[taskId] ?? taskId,
        };
      }
    }

    return next;
  }, [storedState, taskIds, taskLabels]);

  return (
    <Box sx={{ width: "100%" }}>
      {taskIds.map((taskId) => (
        <TaskLogPanel
          key={taskId}
          visit={visit}
          workflowName={workflowName}
          taskId={taskId}
          taskLabel={state[taskId].label}
          taskStatus={taskStatuses[taskId]}
          state={state[taskId]}
          onToggleOpen={() => {
            setStoredState((prev) => ({
              ...prev,
              [taskId]: {
                ...state[taskId],
                open: !state[taskId].open,
              },
            }));
          }}
          onTogglePin={() => {
            setStoredState((prev) => ({
              ...prev,
              [taskId]: {
                ...state[taskId],
                pinned: !state[taskId].pinned,
              },
            }));
          }}
          onAppendLog={(log: LogEntry) => {
            setStoredState((prev) => ({
              ...prev,
              [taskId]: {
                ...state[taskId],
                logs: [...state[taskId].logs, log],
              },
            }));
          }}
        />
      ))}
    </Box>
  );
}

type TaskLogPanelProps = {
  visit: VisitInfo;
  workflowName: string;
  taskId: string;
  taskLabel: string;
  taskStatus?: string;
  state: TaskState;
  onToggleOpen: () => void;
  onTogglePin: () => void;
  onAppendLog: (log: LogEntry) => void;
};

function TaskLogPanel({
  visit,
  workflowName,
  taskId,
  taskLabel,
  taskStatus,
  state,
  onToggleOpen,
  onTogglePin,
  onAppendLog,
}: TaskLogPanelProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  const { logs, hasReceivedLiveLogs } = useArgoLogs({
    visit,
    workflowName,
    taskId,
    enabled: true,
  });

  const lastIndex = useRef(state.logs.length);

  const isRunning =
    taskStatus === "RUNNING" || hasReceivedLiveLogs;

  const isFinished = [
    "SUCCEEDED",
    "FAILED",
    "ERROR",
    "ERRORED",
    "SKIPPED",
    "OMITTED",
  ].includes(taskStatus ?? "");

  const isWaiting = !isRunning && !isFinished;

  useEffect(() => {
    for (let i = lastIndex.current; i < logs.length; i++) {
      onAppendLog(logs[i]);
    }

    lastIndex.current = logs.length;
  }, [logs, onAppendLog]);

  useEffect(() => {
    if (!containerRef.current || state.pinned) {
      return;
    }

    containerRef.current.scrollTop =
      containerRef.current.scrollHeight;
  }, [state.logs, state.pinned]);

  return (
    <Accordion
      expanded={state.open}
      onChange={onToggleOpen}
      disableGutters
      sx={{
        mb: 1,
        border: "1px solid #333",
        backgroundColor: "#111",
      }}
    >
      <AccordionSummary
        expandIcon={
          <ExpandMoreIcon
            sx={{
              color: "#00ff00",
            }}
          />
        }
        sx={{
          backgroundColor: "#1a1a1a",
          borderBottom: "1px solid #333",
          minHeight: 48,
        }}
      >
        <Typography
          sx={{
            flex: 1,
            color: "#00ff00",
            fontFamily: "monospace",
            fontWeight: 600,
          }}
        >
          $ {taskLabel}{" "}

          {isRunning && (
            <Box
              component="span"
              sx={{
                display: "inline-flex",
                alignItems: "center",
                gap: 0.5,
                color: "#00ff00",
                fontWeight: 700,
              }}
            >
              <Box
                component="span"
                sx={{
                  width: 10,
                  height: 10,
                  borderRadius: "50%",
                  backgroundColor: "#00ff00",
                  animation: "pulse 1s infinite",
                  "@keyframes pulse": {
                    "0%": {
                      opacity: 0.2,
                    },
                    "50%": {
                      opacity: 1,
                    },
                    "100%": {
                      opacity: 0.2,
                    },
                  },
                }}
              />
              LIVE
            </Box>
          )}

          {isFinished && (
            <Box
              component="span"
              sx={{
                color: "#666",
                ml: 1,
              }}
            >
              ☁️ CACHED
            </Box>
          )}

          {isWaiting && (
            <Box
              component="span"
              sx={{
                color: "#777",
                ml: 1,
              }}
            >
              ⏳ WAITING
            </Box>
          )}
        </Typography>

        <IconButton
          onClick={(e) => {
            e.stopPropagation();
            onTogglePin();
          }}
          size="small"
        >
          {state.pinned ? (
            <PushPinIcon
              sx={{
                color: "#00ff00",
              }}
            />
          ) : (
            <PushPinOutlinedIcon
              sx={{
                color: "#00ff00",
              }}
            />
          )}
        </IconButton>
      </AccordionSummary>

      <AccordionDetails
        sx={{
          p: 0,
          backgroundColor: "#000",
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
            overflowY: "auto",
            overflowX: "hidden",
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
            p: 1.5,
            display: "flex",
            flexDirection: "column",
            border: "1px solid #00aa00",
            boxShadow: "inset 0 0 10px rgba(0,255,0,0.15)",
          }}
        >
          {state.logs.length === 0 ? (
            <Typography
              sx={{
                color: "#666",
                fontFamily: "monospace",
                fontSize: 12,
              }}
            >
              {isRunning
                ? "Waiting for logs..."
                : "No logs available"}
            </Typography>
          ) : (
            state.logs.map((log, index) => (
              <div key={index}>{log.content}</div>
            ))
          )}
        </Box>
      </AccordionDetails>
    </Accordion>
  );
}