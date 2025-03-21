import React, { useState, useEffect } from "react";
import { Box, Container } from "@mui/material";
import { ResizableBox } from "react-resizable";
import { graphql } from "relay-runtime";
import { SingleWorkflowViewQuery as SingleWorkflowViewQueryType } from "./__generated__/SingleWorkflowViewQuery.graphql";
import { Visit } from "@diamondlightsource/sci-react-ui";

import type { Artifact, Task, TaskStatus } from "workflows-lib";
import { TasksFlow } from "workflows-lib";
import { useLazyLoadQuery, useFragment } from "react-relay/hooks";
import WorkflowRelay, { workflowFragment } from "./WorkflowRelay";
import { WorkflowRelayFragment$key } from "./__generated__/WorkflowRelayFragment.graphql";
import { TaskInfo } from "./TaskInfo";

const SingleWorkflowViewQuery = graphql`
  query SingleWorkflowViewQuery($visit: VisitInput!, $workflowname: String!) {
    workflow(visit: $visit, name: $workflowname) {
      ...WorkflowRelayFragment
    }
  }
`;

interface SingleWorkflowViewProps {
  visit: Visit;
  workflowname: string;
  taskname?: string;
}

export const SingleWorkflowInfo: React.FC<SingleWorkflowViewProps> = ({
  visit,
  workflowname,
  taskname: initialTaskname,
}) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [artifactList, setArtifactList] = useState<Artifact[]>([]);
  const [taskname, setTaskname] = useState<string | undefined>(initialTaskname);

  const data = useLazyLoadQuery<SingleWorkflowViewQueryType>(
    SingleWorkflowViewQuery,
    {
      visit,
      workflowname,
    }
  );
  console.log(`data is ${JSON.stringify(data)}`);
  const workflowData = useFragment<WorkflowRelayFragment$key>(
    workflowFragment,
    data.workflow
  );

  useEffect(() => {
    let fetchedTasks: Task[] = [];
    if (
      workflowData &&
      workflowData.status?.__typename &&
      [
        "WorkflowErroredStatus",
        "WorkflowFailedStatus",
        "WorkflowRunningStatus",
        "WorkflowSucceededStatus",
      ].includes(workflowData.status?.__typename)
    ) {
      fetchedTasks =
        workflowData.status?.tasks?.map((task) => ({
          id: task.id,
          name: task.name,
          status: task.status as TaskStatus,
          depends: [...task.depends],
          artifacts: [...task.artifacts],
          workflow: workflowname,
          instrumentSession: visit,
        })) ?? [];
    }
    setTasks(fetchedTasks);

    if (taskname) {
      const filteredTask = fetchedTasks.find((task) => task.name === taskname);
      const artifacts: Artifact[] = filteredTask?.artifacts ?? [];
      setArtifactList(artifacts);
    }
  }, [data, taskname, workflowname, visit]);

  useEffect(() => {
    setTaskname(initialTaskname);
  }, [initialTaskname]);

  return (
    <>
      <Container maxWidth="sm">
        <Box
          display="flex"
          flexDirection="column"
          alignItems="center"
          marginTop="20px"
        >
          <WorkflowRelay workflow={data.workflow} expanded={true}>
            <ResizableBox
              width={1150}
              height={400}
              resizeHandles={["se"]}
              style={{
                border: "2px dashed #ccc",
                padding: "10px",
                overflow: "auto",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <TasksFlow tasks={tasks} />
            </ResizableBox>
          </WorkflowRelay>
          {taskname && <TaskInfo artifactList={artifactList}></TaskInfo>}
        </Box>
      </Container>
    </>
  );
};
