import React from "react";
import { Dialog, DialogTitle, DialogContent } from "@mui/material";
import { useArgoLogs } from "../hooks/useArgoLogs";

export function LogPopup({
  open,
  onClose,
  visit,
  workflowName,
  taskId,
}: {
  open: boolean;
  onClose: () => void;
  visit: any;
  workflowName: string;
  taskId: string | null;
}) {
  const { logs, error } = useArgoLogs({
    visit,
    workflowName,
    taskId,
    enabled: open,
  });

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>Live Logs</DialogTitle>

      <DialogContent
        style={{
          background: "#111",
          color: "#0f0",
          fontFamily: "monospace",
          height: "400px",
          overflow: "auto",
        }}
      >
        {error && <div style={{ color: "red" }}>{error}</div>}

        {logs.map((l, i) => (
          <div key={i}>
            [{l.podName}] {l.content}
          </div>
        ))}
      </DialogContent>
    </Dialog>
  );
}