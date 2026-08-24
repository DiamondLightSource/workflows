import React, { useEffect, useMemo, useRef, useState } from "react";
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
    logs(visit: $visit, workflowName: $workflowName, taskId: $taskId) {
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

interface TaskLogViewerContentProps {
  visit: Visit;
  workflowName: string;
  selectedTaskId: string;
  selectedTaskName?: string;
}

function TaskLogViewerContent({
  visit,
  workflowName,
  selectedTaskId,
  selectedTaskName,
}: TaskLogViewerContentProps) {
  const [logLines, setLogLines] = useState<string[]>([]);
  const [taskCompleted, setTaskCompleted] = useState(false);
  const [expanded, setExpanded] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

  const subscriptionConfig = useMemo<
    GraphQLSubscriptionConfig<TaskLogViewerSubscription>
  >(
    () => ({
      subscription: taskLogViewerSubscription,
      variables: {
        visit,
        workflowName,
        taskId: selectedTaskId,
      },

      onNext: (payload) => {
        if (!payload) {
          return;
        }
        const line = payload.logs.content;

        if (!line) {
          return;
        }

        setLogLines((previousLines) => [...previousLines, line]);

        const hasFinished =
          line.includes("sub-process exited") ||
          line.includes("completed") ||
          line.includes("finished") ||
          line.includes("Image saved") ||
          line.includes("saved image") ||
          line.includes("done");

        if (hasFinished) {
          setTaskCompleted(true);
        }
      },

      onCompleted: () => {
        setTaskCompleted(true);
      },

      onError: (error) => {
        console.error("Log subscription error:", error);
        setTaskCompleted(true);
      },
    }),
    [visit, workflowName, selectedTaskId],
  );

  useSubscription(subscriptionConfig);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [logLines]);

  return (
    <Accordion
      expanded={expanded}
      onChange={(_, isExpanded) => {
        setExpanded(isExpanded);
      }}
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
          {logLines.length === 0 && !taskCompleted && (
            <Typography>Waiting for log output...</Typography>
          )}

          {logLines.map((line, index) => {
            return <Box key={`${selectedTaskId}-${String(index)}`}>{line}</Box>;
          })}
        </Box>
      </AccordionDetails>
    </Accordion>
  );
}

export const TaskLogViewer: React.FC<TaskLogViewerProps> = ({
  visit,
  workflowName,
  selectedTaskId,
  selectedTaskName,
}) => {
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
          expandIcon={<ArrowDropDownIcon sx={{ color: "#00ff00" }} />}
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

        <AccordionDetails sx={{ p: 0 }}>
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

  return (
    <TaskLogViewerContent
      key={`${workflowName}-${selectedTaskId}`}
      visit={visit}
      workflowName={workflowName}
      selectedTaskId={selectedTaskId}
      selectedTaskName={selectedTaskName}
    />
  );
};

export default TaskLogViewer;
