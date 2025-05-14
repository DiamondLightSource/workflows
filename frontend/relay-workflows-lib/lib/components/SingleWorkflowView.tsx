import React, { useState, useEffect } from "react";
import { Box, Container } from "@mui/material";
import { graphql } from "relay-runtime";
import { workflowFragment$key } from "../graphql/__generated__/workflowFragment.graphql";
import { SingleWorkflowViewQuery as SingleWorkflowViewQueryType } from "./__generated__/SingleWorkflowViewQuery.graphql";
import { Visit } from "@diamondlightsource/sci-react-ui";

import type { Artifact, Task, TaskStatus } from "workflows-lib";
import { useLazyLoadQuery, useFragment } from "react-relay/hooks";
import WorkflowRelay from "relay-workflows-lib/lib/components/WorkflowRelay";
import { workflowFragment } from "../graphql/workflowFragment";
import { TaskInfo } from "workflows-lib/lib/components/workflow/TaskInfo";
import { isWorkflowWithTasks } from "../utils";

const singleWorkflowViewQuery = graphql`
  query SingleWorkflowViewQuery($visit: VisitInput!, $workflowname: String!) {
    workflow(visit: $visit, name: $workflowname) {
      ...workflowFragment
    }
  }
`;
interface SingleWorkflowViewProps {
  visit: Visit;
  workflowname: string;
  taskname?: string;
}

const SingleWorkflowView: React.FC<SingleWorkflowViewProps> = ({
  visit,
  workflowname,
  taskname: initialTaskname,
}) => {
  const [artifactList, setArtifactList] = useState<Artifact[]>([]);
  const [taskname, setTaskname] = useState<string | undefined>(initialTaskname);

  const data = useLazyLoadQuery<SingleWorkflowViewQueryType>(
    singleWorkflowViewQuery,
    {
      visit,
      workflowname,
    },
  );
  const workflowData = useFragment<workflowFragment$key>(
    workflowFragment,
    data.workflow,
  );

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
          <WorkflowRelay
            workflow={data.workflow}
            expanded={true}
            highlightedTaskName={taskname}
          />
          {taskname && <TaskInfo artifactList={artifactList}></TaskInfo>}
        </Box>
      </Container>
    </>
  );
};

export default SingleWorkflowView;
