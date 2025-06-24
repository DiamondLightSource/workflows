import { useEffect, useState } from "react";
import { useLazyLoadQuery } from "react-relay";
import { TaskInfo } from "workflows-lib/lib/components/workflow/TaskInfo";
import { Artifact } from "workflows-lib/lib/types";
import WorkflowRelay, { workflowRelayQuery } from "./WorkflowRelay";
import { isWorkflowWithTasks } from "../utils";
import { Visit } from "@diamondlightsource/sci-react-ui";
import { WorkflowRelayQuery as WorkflowRelayQueryType } from "./__generated__/WorkflowRelayQuery.graphql";

interface SingleWorkflowViewProps {
  visit: Visit;
  workflowName: string;
  taskname?: string;
}

export default function SingleWorkflowView({
  visit,
  workflowName,
  taskname,
}: SingleWorkflowViewProps) {
  const data = useLazyLoadQuery<WorkflowRelayQueryType>(workflowRelayQuery, {
    visit: visit,
    name: workflowName,
  });
  const workflow = data.workflow;

  const [artifactList, setArtifactList] = useState<Artifact[]>([]);

  useEffect(() => {
    if (
      taskname &&
      data.workflow.status &&
      isWorkflowWithTasks(data.workflow.status)
    ) {
      const task = data.workflow.status.tasks.find((t) => t.name === taskname);
      setArtifactList([...(task?.artifacts ?? [])]);
    }
  }, [workflow, taskname, data.workflow.status]);

  return (
    <>
      <WorkflowRelay
        key={workflowName}
        visit={visit}
        workflowName={workflowName}
        workflowLink
        expanded={true}
        highlightedTaskName={taskname}
      />
      {taskname && (
        <div style={{ width: "100%", marginTop: "1rem" }}>
          <TaskInfo artifactList={artifactList} />
        </div>
      )}
    </>
  );
}
