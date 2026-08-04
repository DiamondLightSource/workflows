import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Box,
  Typography,
  CircularProgress,
} from "@mui/material";
import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown";
import { graphql, useSubscription } from "react-relay";
import { GraphQLSubscriptionConfig } from "relay-runtime";
import { Visit } from "@diamondlightsource/sci-react-ui";
import { TaskLogViewerSubscription } from "./__generated__/TaskLogViewerSubscription.graphql";

const taskLogViewerSubscription = graphql`
  subscription TaskLogViewerSubscription(
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
`;

interface TaskLogViewerProps {
  visit: Visit;
  workflowName: string;
  selectedTaskId: string | null;
  selectedTaskName?: string;
}

export const TaskLogViewer: React.FC<TaskLogViewerProps> = ({
  visit,
  workflowName,
  selectedTaskId,
  selectedTaskName,
}) => {
  console.log("TASK VIEWER PROPS", {
    selectedTaskId,
    selectedTaskName,
    workflowName,
  });

  // --- ALL HOOKS MUST BE AT THE TOP, BEFORE ANY EARLY RETURN ---

  const [logLines, setLogLines] = useState<string[]>([]);
  const [taskCompleted, setTaskCompleted] = useState(false);
  const [podName, setPodName] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    console.log("CLEARING LOGS - TaskLogViewer selection changed:", {
      workflowName,
      selectedTaskId,
      visit,
    });

    setLogLines([]);
    setTaskCompleted(false);
    setExpanded(!!selectedTaskId);
  }, [selectedTaskId, workflowName, visit]);

  console.log("SELECTED TASK:", {
    selectedTaskId,
    selectedTaskName,
  });

  // Build subscription config unconditionally
  const subscriptionConfig = useMemo<GraphQLSubscriptionConfig<TaskLogViewerSubscription>>(
    () => ({
      subscription: taskLogViewerSubscription,

      variables: {
        visit,
        workflowName,
        taskId: selectedTaskId ?? "",
      },

      skip: !selectedTaskId,

      onNext: (payload) => {
        console.log("LOG RECEIVED:", payload);

        const line = payload?.logs?.content;

        if (line) {
          console.log("APPENDING:", line);
          setLogLines((prev) => [...prev, line]);

          if (
            line.includes("sub-process exited") ||
            line.includes("completed") ||
            line.includes("finished") ||
            line.includes("Image saved") ||
            line.includes("saved image") ||
            line.includes("done")
          ) {
            setTaskCompleted(true);
          }
        }
      },

      onCompleted: () => {
        console.log("LOG SUBSCRIPTION COMPLETED");
        setTaskCompleted(true);
      },

      onError: (error) => {
        console.error("Log subscription error:", error);
        // Treat errors as "done" for UI so we don't show "Waiting..." forever
        setTaskCompleted(true);
      },
    }),
    [visit, workflowName, selectedTaskId]
  );
  console.log("SUBSCRIBING WITH:", subscriptionConfig.variables);
  console.log("TASK VIEWER", {
    selectedTaskId,
    skip: !selectedTaskId,
  });

  // ALWAYS called, regardless of selectedTaskId
  useSubscription(subscriptionConfig);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [logLines]);

  // --- NOW YOU CAN DO EARLY RETURN FOR UI ONLY ---

  if (!selectedTaskId) {
    return (
      <Accordion
        expanded={false}
        sx={{
          mt: 2,
          width: "100%",
          backgroundColor: "#001400",
          color: "#00ff00",
        }}
      >
        <AccordionSummary
          expandIcon={
            <ArrowDropDownIcon sx={{ color: "#00ff00" }} />
          }
        >
          <Typography
            sx={{
              color: "#00ff00",
              fontFamily: "monospace",
              fontSize: "0.9rem",
            }}
          >
            Logs: No task selected
          </Typography>
        </AccordionSummary>
        <AccordionDetails
          sx={{
            p: 0,
          }}
        >
          <Box
            sx={{
              height: 200,
              overflowY: "auto",
              p: 2,
              bgcolor: "#000",
              color: "#00ff00",
              fontFamily: "monospace",
              fontSize: "10px",
              whiteSpace: "pre-wrap",
            }}
          >
            <Typography>Select a task.</Typography>
          </Box>
        </AccordionDetails>
      </Accordion>
    );
  }

  // Main UI when a task IS selected
  return (
    <Accordion
      expanded={expanded}
      onChange={(_, isExpanded) => setExpanded(isExpanded)}
      sx={{
        mt: 2,
        width: "100%",
        backgroundColor: "#001400",
        color: "#00ff00",
      }}
    >
      <AccordionSummary
        expandIcon={<ArrowDropDownIcon sx={{ color: "#00ff00" }} />}
      >
        <Typography
          sx={{
            color: "#00ff00",
            fontFamily: "monospace",
            fontSize: "0.9rem",
          }}
        >
          Logs: {selectedTaskName ?? selectedTaskId}
        </Typography>

        {!taskCompleted && (
          <CircularProgress
            size={14}
            sx={{
              color: "rgb(253, 251, 251)",
              marginLeft: "10px",
            }}
          />
        )}

        {taskCompleted && (
          <Typography
            sx={{
              color: "#ff3333",
              fontFamily: "monospace",
              fontSize: "0.75rem",
              ml: 2,
              fontWeight: "bold",
            }}
          >
            COMPLETED
          </Typography>
        )}
      </AccordionSummary>

      <AccordionDetails sx={{ p: 0 }}>
        <Box
          ref={containerRef}
          sx={{
            height: 200,
            overflowY: "auto",
            p: 2,
            bgcolor: "#000",
            color: "#00ff00",
            fontFamily: "monospace",
            fontSize: "10px",
            whiteSpace: "pre-wrap",
          }}
        >
          {selectedTaskId && logLines.length === 0 && !taskCompleted && (
            <Typography>Waiting for log output...</Typography>
          )}

          {logLines.map((line, index) => (
            <Box key={index}>{line}</Box>
          ))}
        </Box>
      </AccordionDetails>
    </Accordion>
  );
};

export default TaskLogViewer;