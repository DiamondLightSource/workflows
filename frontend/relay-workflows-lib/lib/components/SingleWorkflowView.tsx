import React, { useState, useEffect } from "react";
import { Box, Container } from "@mui/material";
import { ResizableBox } from "react-resizable";
import { graphql } from "relay-runtime";
import {
    workflowFragment$key,
    workflowFragment$data,
} from "./__generated__/workflowFragment.graphql";
import { SingleWorkflowViewQuery as SingleWorkflowViewQueryType } from "./__generated__/SingleWorkflowViewQuery.graphql";
import { Visit } from "@diamondlightsource/sci-react-ui";

import type { Artifact, Task, TaskStatus } from "workflows-lib";
import { TasksFlow } from "workflows-lib";
import { useLazyLoadQuery, useFragment } from "react-relay/hooks";
import WorkflowRelay from "relay-workflows-lib/lib/components/WorkflowRelay";
import { workflowFragment } from "./workflow"; 
import { TaskInfo } from "workflows-lib/lib/components/workflow/TaskInfo";
import { useNavigate } from "react-router-dom";

type WorkflowStatusType = NonNullable<  workflowFragment$data["status"]>;

const SingleWorkflowViewQuery = graphql`
  query SingleWorkflowViewQuery($visit: VisitInput!, $workflowname: String!) {
    workflow(visit: $visit, name: $workflowname) {
      ...  workflowFragment
    }
  }
`;

interface SingleWorkflowViewProps {
  visit: Visit;
  workflowname: string;
  taskname?: string;
}

const isWorkflowWithTasks = (status: WorkflowStatusType) => {
  return (
    status.__typename === "WorkflowErroredStatus" ||
    status.__typename === "WorkflowFailedStatus" ||
    status.__typename === "WorkflowRunningStatus" ||
    status.__typename === "WorkflowSucceededStatus"
  );
};

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
  const workflowData = useFragment<workflowFragment$key>(
    workflowFragment,
    data.workflow
  );

  const navigate = useNavigate();

  useEffect(() => {
    let fetchedTasks: Task[] = [];
    if (workflowData.status && isWorkflowWithTasks(workflowData.status)) {
      fetchedTasks = workflowData.status.tasks.map((task) => ({
        id: task.id,
        name: task.name,
        status: task.status as TaskStatus,
        depends: [...task.depends],
        artifacts: [...task.artifacts],
        workflow: workflowname,
        instrumentSession: visit,
      }));
    }
    setTasks(fetchedTasks);

    if (taskname) {
      const filteredTask = fetchedTasks.find((task) => task.name === taskname);
      const artifacts: Artifact[] = filteredTask?.artifacts ?? [];
      setArtifactList(artifacts);
    }
  }, [data, taskname, workflowname, visit, workflowData.status]);

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
              <TasksFlow
                tasks={tasks}
                onNavigate={(path: string) => {
                  void navigate(path);
                }}
              />
            </ResizableBox>
          </WorkflowRelay>
          {taskname && <TaskInfo artifactList={artifactList}></TaskInfo>}
        </Box>
      </Container>
    </>
  );
};
