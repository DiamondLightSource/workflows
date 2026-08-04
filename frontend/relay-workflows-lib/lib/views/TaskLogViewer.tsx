import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Box,
  Paper,
  Typography,
  CircularProgress,
} from "@mui/material";
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
}


export const TaskLogViewer: React.FC<TaskLogViewerProps> = ({
  visit,
  workflowName,
  selectedTaskId,
}) => {

  const [logLines, setLogLines] = useState<string[]>([]);

  const containerRef = useRef<HTMLDivElement>(null);


  useEffect(() => {
    console.log("TaskLogViewer selection changed:", {
      workflowName,
      selectedTaskId,
      visit,
    });

    setLogLines([]);

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
            taskId: selectedTaskId ?? "",
        },

        onNext: (payload) => {
            console.log("LOG EVENT:", payload);

            const line = payload?.logs?.content;

            if (line) {
            setLogLines((prev) => [
                ...prev,
                line,
            ]);
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


    console.log("SUBSCRIBING WITH:", subscriptionConfig.variables);
  // IMPORTANT:
  // This hook must ALWAYS run
  useSubscription(subscriptionConfig);



  useEffect(() => {

    if (containerRef.current) {
      containerRef.current.scrollTop =
        containerRef.current.scrollHeight;
    }

  }, [logLines]);



  return (
    <Paper
      elevation={4}
      sx={{
        mt: 2,
        width: "100%",
        overflow: "hidden",
        borderRadius: 2,
        backgroundColor: "#001400",
      }}
    >

      <Box
        sx={{
          px:2,
          py:1,
          bgcolor:"#003300",
          display:"flex",
          justifyContent:"space-between",
        }}
      >

        <Typography
          sx={{
            color:"#00ff00",
            fontFamily:"monospace",
          }}
        >
          {selectedTaskId ?? "No task selected"}
        </Typography>


        {selectedTaskId && (
          <CircularProgress
            size={12}
            sx={{
              color:"#00ff00",
            }}
          />
        )}

      </Box>



      <Box
        ref={containerRef}
        sx={{
          height:300,
          overflowY:"auto",
          p:2,
          bgcolor:"#000",
          color:"#00ff00",
          fontFamily:"monospace",
          whiteSpace:"pre-wrap",
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


        {logLines.map((line,index)=>(
          <Box key={index}>
            {line}
          </Box>
        ))}

      </Box>

    </Paper>
  );
};


export default TaskLogViewer;