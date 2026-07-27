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

  /*
   * S3 URL for the archived main.log.
   */
  logUrl?: string;

  /*
   * True once this task has finished.
   */
  completed?: boolean;

  container?: string;
  enabled?: boolean;
};

/*
 * Global cache shared by every hook instance.
 * This prevents duplicate websocket subscriptions
 * when the task is subscribed in the background
 * and later opened in the UI.
 */
const subscriptions = new Map<
  string,
  {
    dispose: () => void;
    listeners: Set<(log: LogEntry) => void>;
  }
>();

export function useArgoLogs({
  visit,
  workflowName,
  taskId,
  logUrl,
  completed = false,
  container = "main",
  enabled = true,
}: Args) {
  const storageKey = taskId
    ? `workflow-logs-${workflowName}-${taskId}`
    : null;

  const [logs, setLogs] = useState<LogEntry[]>(() => {
    if (!storageKey) {
      return [];
    }

    try {
      const stored =
        localStorage.getItem(storageKey);

      return stored
        ? JSON.parse(stored)
        : [];
    } catch {
      return [];
    }
  });

  const [error, setError] =
    useState<string | null>(null);

  const listenerRef =
    useRef<(log: LogEntry) => void>();

  // const uploadedIndexRef =
  //   useRef(0);

  // const uploadInProgressRef =
  //   useRef(false);


  const [hasReceivedLiveLogs, setHasReceivedLiveLogs] =
  useState(false);  
  const fetchedS3Ref = useRef(false);
  /*
   * Persist logs immediately.
   */
  useEffect(() => {
    if (!storageKey) {
      return;
    }

    localStorage.setItem(
      storageKey,
      JSON.stringify(logs),
    );
  }, [
    logs,
    storageKey,
  ]);

    

  // /*
  // * Upload new logs every 10 seconds.
  // */
  // useEffect(() => {
  //   if (
  //     !taskId ||
  //     logs.length === 0
  //   ) {
  //     return;
  //   }

  //   const interval =
  //     setInterval(async () => {

  //       if (
  //         uploadInProgressRef.current
  //       ) {
  //         return;
  //       }

  //       const newLogs =
  //         logs.slice(
  //           uploadedIndexRef.current,
  //         );

  //       if (
  //         newLogs.length === 0
  //       ) {
  //         return;
  //       }

  //       uploadInProgressRef.current =
  //         true;

  //       try {
  //         await fetch(
  //           "/api/logs/upload",
  //           {
  //             method: "POST",
  //             headers: {
  //               "Content-Type":
  //                 "application/json",
  //             },
  //             body: JSON.stringify({
  //               visit,
  //               workflowName,
  //               taskId,
  //               logs: newLogs,
  //             }),
  //           },
  //         );

  //         uploadedIndexRef.current =
  //           logs.length;
  //       }
  //       catch (err) {
  //         console.error(
  //           "Failed to upload logs",
  //           err,
  //         );
  //       }
  //       finally {
  //         uploadInProgressRef.current =
  //           false;
  //       }

  //     }, 10000);

  //   return () =>
  //     clearInterval(
  //       interval,
  //     );

  // }, [
  //   logs,
  //   taskId,
  //   workflowName,
  //   visit,
  // ]);


  useEffect(() => {
    if (
      !enabled ||
      !taskId ||
      !storageKey
    ) {
      return;
    }

    /*
     * Reload logs from localStorage if another
     * background subscriber already collected some.
     */
    try {
      const stored =
        localStorage.getItem(storageKey);

      if (stored) {
        setLogs(JSON.parse(stored));
      }
    } catch {}

    listenerRef.current = (
      log: LogEntry,
    ) => {
      setLogs((prev) => {
        const last =
          prev[prev.length - 1];

        /*
         * Avoid duplicate messages after reconnect.
         */
        if (
          last &&
          last.content ===
            log.content &&
          last.podName ===
            log.podName
        ) {
          return prev;
        }

        return [
          ...prev,
          log,
        ];
      });
    };

    /*
     * Reuse existing websocket if present.
     */
    const existing =
      subscriptions.get(
        storageKey,
      );

    if (existing) {
      existing.listeners.add(
        listenerRef.current,
      );

      return () => {
        existing.listeners.delete(
          listenerRef.current!,
        );
      };
    }

    console.log(
      "[useArgoLogs] opening websocket:",
      taskId,
    );

    const listeners =
      new Set<
        (
          log: LogEntry,
        ) => void
      >();

    listeners.add(
      listenerRef.current,
    );

    let cancelled = false;

    const dispose =
      wsClient.subscribe(
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

            const log =
              res?.data?.logs;

            if (!log) {
              return;
            }

            setHasReceivedLiveLogs(true);

            /*
             * Save immediately so refreshes preserve logs.
             */
            try {
              const current =
                localStorage.getItem(
                  storageKey,
                );

              const parsed =
                current
                  ? JSON.parse(
                      current,
                    )
                  : [];

              const last =
                parsed[
                  parsed.length -
                    1
                ];

              if (
                !last ||
                last.content !==
                  log.content ||
                last.podName !==
                  log.podName
              ) {
                parsed.push(log);

                localStorage.setItem(
                  storageKey,
                  JSON.stringify(
                    parsed,
                  ),
                );
              }
            } catch {}

            listeners.forEach(
              (
                listener,
              ) => {
                listener(log);
              },
            );
          },

          error: (err: any) => {
            console.error(
              "[useArgoLogs]",
              err,
            );

            if (
              !cancelled
            ) {
              setError(
                err instanceof Error
                  ? err.message
                  : JSON.stringify(
                      err,
                      null,
                      2,
                    ),
              );
            }
          },

          complete: () => {
            console.log(
              `[useArgoLogs] completed ${taskId}`,
            );
          },
        },
      );

    subscriptions.set(
      storageKey,
      {
        dispose: () => {
          dispose();
        },
        listeners,
      },
    );

    return () => {
      if (
        listenerRef.current
      ) {
        listeners.delete(
          listenerRef.current,
        );
      }

      /*
       * Keep websocket alive if background
       * subscribers still exist.
       */
      if (
        listeners.size === 0
      ) {
        cancelled = true;

        try {
          dispose();
        } catch {}

        subscriptions.delete(
          storageKey,
        );
      }
    };
  }, [
    visit.proposalCode,
    visit.proposalNumber,
    visit.number,
    workflowName,
    taskId,
    container,
    enabled,
    storageKey,
  ]);

  /*
  * Once the task has completed, load the archived S3 log
  * if we never received live websocket logs.
  */
  useEffect(() => {
    if (
      !completed ||
      !logUrl ||
      hasReceivedLiveLogs
    ) {
      return;
    }
    const archivedLogUrl = logUrl;

    let cancelled = false;

    async function loadArchivedLog() {
      try {
        console.log(
          "[useArgoLogs] Fetching archived log:",
          archivedLogUrl,
        );

        const response = await fetch(archivedLogUrl);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const text = await response.text();

        const parsed: LogEntry[] = text
          .split("\n")
          .filter((line) => line.trim().length > 0)
          .map((line) => ({
            content: line,
            podName: "main",
          }));

        if (!cancelled) {
          setLogs((existing) => {
            if (existing.length > 0) {
              return existing;
            }

            return parsed;
          });

          if (storageKey) {
            localStorage.setItem(
              storageKey,
              JSON.stringify(parsed),
            );
          }
        }
      } catch (err) {
        console.error(
          "[useArgoLogs] Failed to fetch archived log",
          err,
        );
      }
    }

    loadArchivedLog();

    return () => {
      cancelled = true;
    };
  }, [
    completed,
    logUrl,
    storageKey,
    hasReceivedLiveLogs,
  ]);

  return {
    logs,
    error,
    connected: !error,
    cached:
      logs.length > 0,
    hasReceivedLiveLogs,
  };
}