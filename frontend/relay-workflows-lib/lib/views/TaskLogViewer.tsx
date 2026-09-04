import React, {
  Dispatch,
  SetStateAction,
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

interface TaskLogViewerProps {
  visit: Visit;
  workflowName: string;
  selectedTaskId: string | null;
  selectedTaskName?: string;
}

interface TaskLogSubscriptionProps {
  visit: Visit;
  workflowName: string;
  taskId: string;
  setLogLines: Dispatch<SetStateAction<string[]>>;
  setTaskCompleted: Dispatch<SetStateAction<boolean>>;
  setSubscriptionError: Dispatch<SetStateAction<string | null>>;
}

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

const TaskLogSubscription: React.FC<TaskLogSubscriptionProps> = ({
  visit,
  workflowName,
  taskId,
  setLogLines,
  setTaskCompleted,
  setSubscriptionError,
}) => {
  const subscriptionConfig = useMemo<
    GraphQLSubscriptionConfig<TaskLogViewerSubscription>
  >(
    () => ({
      subscription: taskLogViewerSubscription,
      variables: {
        visit,
        workflowName,
        taskId,
      },
      onNext: (payload) => {
        const line = payload?.logs.content;

        if (line) {
          setLogLines((previousLines) => [...previousLines, line]);
        }
      },
      onError: (error) => {
        console.error("Log subscription error:", error);

        const message = error instanceof Error ? error.message : String(error);

        if (
          message.includes("NoSuchKey") ||
          message.includes("No logs") ||
          message.includes("Failed to retrieve archived log artifact")
        ) {
          setSubscriptionError("No logs available");
        } else {
          setSubscriptionError("Unable to retrieve task logs");
        }

        setTaskCompleted(true);
      },
      onCompleted: () => {
        setTaskCompleted(true);
      },
    }),
    [
      visit,
      workflowName,
      taskId,
      setLogLines,
      setTaskCompleted,
      setSubscriptionError,
    ],
  );

  useSubscription(subscriptionConfig);

  return null;
};

const TaskLogViewerContent: React.FC<TaskLogViewerProps> = ({
  visit,
  workflowName,
  selectedTaskId,
  selectedTaskName,
}) => {
  const [logLines, setLogLines] = useState<string[]>([]);
  const [taskCompleted, setTaskCompleted] = useState(false);
  const [subscriptionError, setSubscriptionError] = useState<string | null>(
    null,
  );
  const [expanded, setExpanded] = useState(Boolean(selectedTaskId));

  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [logLines]);

  return (
    <>
      {selectedTaskId && (
        <TaskLogSubscription
          key={`${workflowName}-${selectedTaskId}`}
          visit={visit}
          workflowName={workflowName}
          taskId={selectedTaskId}
          setLogLines={setLogLines}
          setTaskCompleted={setTaskCompleted}
          setSubscriptionError={setSubscriptionError}
        />
      )}

      <Accordion
        expanded={expanded}
        onChange={(_, isExpanded) => {
          setExpanded(isExpanded);
        }}
        sx={{
          mt: 2,
          width: "100%",
          backgroundColor: "#f3f5f3",
          color: "#030303",
        }}
      >
        <AccordionSummary
          expandIcon={<ArrowDropDownIcon sx={{ color: "#030303" }} />}
        >
          <Typography
            sx={{
              color: "inherit",
              fontSize: "1rem",
            }}
          >
            Logs: {selectedTaskName ?? selectedTaskId ?? "No task selected"}
          </Typography>

          {selectedTaskId && !taskCompleted && (
            <CircularProgress
              size={14}
              sx={{
                color: "rgb(253, 251, 251)",
                marginLeft: "10px",
              }}
            />
          )}

          {selectedTaskId && taskCompleted && (
            <Typography
              sx={{
                color: "#ff3333",
                fontFamily: "monospace",
                fontSize: "0.75rem",
                ml: 2,
                fontWeight: "bold",
              }}
            >
              ARCHIVED
            </Typography>
          )}
        </AccordionSummary>

        <AccordionDetails sx={{ p: 0 }}>
          <Box
            ref={containerRef}
            sx={{
              height: 180,
              overflowY: "auto",
              p: 2,
              bgcolor: "#313030",
              color: "#ffffff",
              fontFamily: "monospace",
              fontSize: "10px",
              whiteSpace: "pre-wrap",
            }}
          >
            {subscriptionError ? (
              <Typography
                sx={{
                  color: "#ff3333",
                  fontFamily: "monospace",
                  fontSize: "10px",
                }}
              >
                {subscriptionError}
              </Typography>
            ) : logLines.length > 0 ? (
              logLines.map((line, index) => (
                <React.Fragment key={`${line}-${String(index)}`}>
                  {line}
                  {index < logLines.length - 1 && "\n"}
                </React.Fragment>
              ))
            ) : (
              <Typography
                sx={{
                  color: "#00ff00",
                  fontFamily: "monospace",
                  fontSize: "12px",
                }}
              >
                {selectedTaskId ? "Waiting for logs..." : "No task selected"}
              </Typography>
            )}
          </Box>
        </AccordionDetails>
      </Accordion>
    </>
  );
};

export const TaskLogViewer: React.FC<TaskLogViewerProps> = ({
  visit,
  workflowName,
  selectedTaskId,
  selectedTaskName,
}) => {
  return (
    <TaskLogViewerContent
      key={`${workflowName}-${selectedTaskId ?? "none"}-${visit.proposalCode}-${String(visit.proposalNumber)}-${String(visit.number)}`}
      visit={visit}
      workflowName={workflowName}
      selectedTaskId={selectedTaskId}
      selectedTaskName={selectedTaskName}
    />
  );
};
