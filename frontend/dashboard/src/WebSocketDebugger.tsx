import { useEffect, useState } from "react";
import { wsClient } from "./RelayEnvironment";
import { Typography } from "@mui/material";

export function WebSocketDebugger() {
  const [status, setStatus] = useState<
    "connected" | "closed" | "error" | "unknown"
  >("unknown");

  useEffect(() => {
    const handleConnected = () => {
      setStatus("connected");
    };
    const handleClosed = () => {
      setStatus("closed");
    };
    const handleError = () => {
      setStatus("error");
    };

    wsClient.on("connected", handleConnected);
    wsClient.on("closed", handleClosed);
    wsClient.on("error", handleError);

    return () => {};
  }, []);

  return <Typography>WebSocket Status: {status}</Typography>;
}
