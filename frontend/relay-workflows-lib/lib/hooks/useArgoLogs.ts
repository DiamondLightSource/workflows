import { useEffect, useRef, useState } from "react";
import { wsClient } from "../components/RelayEnvironment";

export type LogEntry = {
  content: string;
  podName: string;
};

type Args = {
  visit: {
    proposalCode: string;
    proposalNumber: number;
    number: number;
  };
  workflowName: string;
  taskId: string | null;
  container?: string;
  enabled?: boolean;
};

export function useArgoLogs({
  visit,
  workflowName,
  taskId,
  container = "main",
  enabled = true,
}: Args) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [error, setError] = useState<string | null>(null);

  const unsubscribeRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!enabled || !taskId) {
      return;
    }

    console.log("[useArgoLogs] subscribing to task:", taskId);

    // DO NOT clear logs here.
    // If Relay refreshes or websocket reconnects we want
    // previously received logs to remain visible.
    setError(null);

    let cancelled = false;

    const dispose = wsClient.subscribe(
      {
        query: `
          subscription Logs(
            $visit: VisitInput!
            $workflowName: String!
            $taskId: String!
          ) {
            logs(
              visit: $visit
              workflowName: $workflowName
              taskId: $taskId
            ) {
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
          if (cancelled) {
            return;
          }

          console.log("[useArgoLogs] WS message:", res);

          const log = res?.data?.logs;

          if (!log) {
            return;
          }

          setLogs((prev) => {
            const last = prev[prev.length - 1];

            // avoid duplicate messages after reconnect
            if (
              last &&
              last.content === log.content &&
              last.podName === log.podName
            ) {
              return prev;
            }

            return [...prev, log];
          });
        },

        error: (err: any) => {
          console.error("[useArgoLogs] WS error:", err);

          if (!cancelled) {
            setError(
              err instanceof Error
                ? err.message
                : JSON.stringify(err, null, 2),
            );
          }
        },

        complete: () => {
          console.log(
            "[useArgoLogs] subscription completed",
          );
        },
      },
    );

    unsubscribeRef.current = () => {
      try {
        dispose();
      } catch (e) {
        console.warn(
          "[useArgoLogs] dispose error",
          e,
        );
      }
    };

    return () => {
      cancelled = true;

      unsubscribeRef.current?.();
      unsubscribeRef.current = null;
    };
  }, [
    visit.proposalCode,
    visit.proposalNumber,
    visit.number,
    workflowName,
    taskId,
    container,
    enabled,
  ]);

  return {
    logs,
    error,
  };
}