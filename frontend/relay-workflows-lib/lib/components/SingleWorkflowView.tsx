import { useEffect, useState } from "react";
import { useLazyLoadQuery } from "react-relay";
import { TaskInfo } from "workflows-lib/lib/components/workflow/TaskInfo";
import { Artifact, Task, TaskStatus } from "workflows-lib/lib/types";
import WorkflowRelay, { workflowRelayQuery } from "./WorkflowRelay";
import { isWorkflowWithTasks } from "../utils";
import { Visit } from "@diamondlightsource/sci-react-ui";
import { WorkflowRelayQuery as WorkflowRelayQueryType } from "./__generated__/WorkflowRelayQuery.graphql";

interface SingleWorkflowViewProps {
  visit: Visit;
  workflowName: string;
  tasknames?: string[];
}

export default function SingleWorkflowView({
  visit,
  workflowName,
  tasknames,
}: SingleWorkflowViewProps) {
  const data = useLazyLoadQuery<WorkflowRelayQueryType>(workflowRelayQuery, {
    visit: visit,
    name: workflowName,
  });
  const workflow = data.workflow;

  const [artifactList, setArtifactList] = useState<Artifact[]>([]);

  useEffect(() => {
    let fetchedTasks: Task[] = [];
    if (data.workflow.status && isWorkflowWithTasks(data.workflow.status)) {
      fetchedTasks = data.workflow.status.tasks.map((task) => ({
        id: task.id,
        name: task.name,
        status: task.status as TaskStatus,
        artifacts: task.artifacts.map((artifact) => ({
          ...artifact,
          parentTask: task.name,
          key: `${task.name}-${artifact.name}`,
        })),
        workflow: workflowName,
        instrumentSession: visit,
        stepType: task.stepType,
      }));
    }

    const filteredTasks = tasknames?.length
      ? tasknames
          .map((name) => fetchedTasks.find((task) => task.name === name))
          .filter((task): task is Task => !!task)
      : fetchedTasks;
    setArtifactList(filteredTasks.flatMap((task) => task.artifacts));
  }, [workflow, tasknames, data.workflow.status]);

  return (
    <>
      <WorkflowRelay
        key={workflowName}
        visit={visit}
        workflowName={workflowName}
        workflowLink
        expanded={true}
        highlightedTaskNames={tasknames}
      />
      <div style={{ width: "100%", marginTop: "1rem" }}>
        <TaskInfo artifactList={artifactList} />
      </div>
    </>
  );
}
