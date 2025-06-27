import React, { useState, useEffect } from "react";
import { Box } from "@mui/material";
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
  workflowName: string;
  tasknames?: string[];
}

const SingleWorkflowView: React.FC<SingleWorkflowViewProps> = ({
  visit,
  workflowName,
  tasknames: initialTasknames,
}) => {
  const [artifactList, setArtifactList] = useState<Artifact[]>([]);
  const [tasknames, setTasknames] = useState<string[] | undefined>(initialTasknames);

  const data = useLazyLoadQuery<SingleWorkflowViewQueryType>(
    singleWorkflowViewQuery,
    {
      visit,
      workflowname: workflowName,
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
        artifacts: task.artifacts.map((artifact) => ({
          ...artifact, parentTask: task.name, key: `${task.name}-${artifact.name}`,
        })),
        workflow: workflowName,
        instrumentSession: visit,
        stepType: task.stepType
      }));
    }

    if (tasknames) {
      const filteredTasks = tasknames
        .map(name => fetchedTasks.find(task => task.name === name))
        .filter((task): task is Task => !!task);
      const artifacts: Artifact[] = filteredTasks
        ? filteredTasks.flatMap(task => task.artifacts) : [];
      setArtifactList(artifacts);
    }
  }, [data, tasknames, workflowName, visit, workflowData.status]);

  useEffect(() => {
    setTasknames(initialTasknames);
  }, [initialTasknames]);

  return (
    <Box sx={{ width: "100%" }}>
      <WorkflowRelay
        workflow={data.workflow}
        expanded={true}
        highlightedTaskNames={tasknames}
      />
      {tasknames && (
        <Box sx={{ width: "100%" }}>
          <TaskInfo artifactList={artifactList} />
        </Box>
      )}
    </Box>
  );
};

export default SingleWorkflowView;
