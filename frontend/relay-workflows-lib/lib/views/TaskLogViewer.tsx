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

  const [logLines, setLogLines] = useState<string[]>([]);
  const [taskCompleted, setTaskCompleted] = useState(false);
  const [podName, setPodName] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);


  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    console.log("TaskLogViewer selection changed:", {
        workflowName,
        selectedTaskId,
        visit,
    });

    setLogLines([]);
    setTaskCompleted(false);
    setExpanded(!!selectedTaskId);

    }, [
    selectedTaskId,
    workflowName,
    visit,
    ]);


  const subscriptionConfig =
    useMemo<GraphQLSubscriptionConfig<TaskLogViewerSubscription>>(
      () => ({
        subscription: taskLogViewerSubscription,

        variables: {
          visit,
          workflowName,
          taskId: selectedTaskId ?? "__NO_TASK_SELECTED__",
        },

        onNext: (payload) => {
        console.log("LOG EVENT:", payload);

        const line = payload?.logs?.content;

        if (line) {
            setLogLines((prev) => [
            ...prev,
            line,
            ]);

            if (
            line.includes("sub-process exited") ||
            line.includes("completed") ||
            line.includes("finished") ||
            line.includes("done")
            ) {
            setTaskCompleted(true);
            }
        }
        },

        onError: (error) => {
          console.error("Log subscription error:", error);
        },
      }),
      [
        visit,
        workflowName,
        selectedTaskId,
      ],
    );


  console.log(
    "SUBSCRIBING WITH:",
    subscriptionConfig.variables
  );


  // MUST ALWAYS RUN - never put hooks inside conditions
  useSubscription(subscriptionConfig);


  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop =
        containerRef.current.scrollHeight;
    }
  }, [logLines]);



  return (
    <Accordion
        expanded={expanded}
        onChange={(_, isExpanded) => { setExpanded(isExpanded); }}
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


        <AccordionDetails
        sx={{
            p: 0,
        }}
        >

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

            {!selectedTaskId && (
            <Typography>
                Select a task.
            </Typography>
            )}


            {selectedTaskId &&
            logLines.length === 0 && (
                <Typography>
                Waiting for log output...
                </Typography>
            )}


            {logLines.map((line, index) => (
            <Box key={index}>
                {line}
            </Box>
            ))}

        </Box>

        </AccordionDetails>

    </Accordion>
);
};


export default TaskLogViewer;