import { useEffect, useState } from "react";
import { PreloadedQuery, useFragment, usePreloadedQuery } from "react-relay";
import { TaskInfo } from "workflows-lib/lib/components/workflow/TaskInfo";
import { Artifact } from "workflows-lib/lib/types";
import { singleWorkflowViewQuery } from "./SingleWorkflowView";
import WorkflowRelay from "./WorkflowRelay";
import { isWorkflowWithTasks } from "../utils";
import {
  SingleWorkflowViewQuery,
  SingleWorkflowViewQuery as SingleWorkflowViewQueryType,
} from "./__generated__/SingleWorkflowViewQuery.graphql";
import { workflowFragment$key } from "../graphql/__generated__/workflowFragment.graphql";
import { workflowFragment } from "../graphql/workflowFragment";

interface SingleWorkflowContentProps {
  queryReference: PreloadedQuery<SingleWorkflowViewQuery>;
  taskname?: string;
}

export default function SingleWorkflowContent({
  queryReference,
  taskname,
}: SingleWorkflowContentProps) {
  const data = usePreloadedQuery<SingleWorkflowViewQueryType>(
    singleWorkflowViewQuery,
    queryReference,
  );
  const workflow = data.workflow;

  const unwrappedWorkflow = useFragment<workflowFragment$key>(
    workflowFragment,
    workflow,
  );

  const [artifactList, setArtifactList] = useState<Artifact[]>([]);

  useEffect(() => {
    if (
      taskname &&
      unwrappedWorkflow.status &&
      isWorkflowWithTasks(unwrappedWorkflow.status)
    ) {
      const task = unwrappedWorkflow.status.tasks.find(
        (t) => t.name === taskname,
      );
      setArtifactList([...(task?.artifacts ?? [])]);
    }
  }, [workflow, taskname, unwrappedWorkflow.status]);

  return (
    <>
      <WorkflowRelay
        workflow={workflow}
        highlightedTaskName={taskname}
        expanded={true}
      />
      {taskname && (
        <div style={{ width: "100%", marginTop: "1rem" }}>
          <TaskInfo artifactList={artifactList} />
        </div>
      )}
    </>
  );
}
