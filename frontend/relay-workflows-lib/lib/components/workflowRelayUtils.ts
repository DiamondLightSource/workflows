import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Visit, Task, TaskStatus } from "workflows-lib";
import { isWorkflowWithTasks } from "../utils";
import { WorkflowRelayQuery$data } from "./__generated__/WorkflowRelayQuery.graphql";

export function updateSearchParamsWithTasks(
  updatedTasks: string[],
  searchParams: URLSearchParams,
  setSearchParams: (params: URLSearchParams) => void
) {
  const params = new URLSearchParams(searchParams);
  if (updatedTasks.length > 0) {
    params.set("tasks", JSON.stringify(updatedTasks));
  } else {
    params.delete("tasks");
  }
  setSearchParams(params);
}

export function getTasksFromSearchParams(searchParams: URLSearchParams) {
  const taskParam = searchParams.get("tasks");
  if (!taskParam) return [];
  try {
    const parsed = JSON.parse(taskParam) as string[];
    return Array.isArray(parsed) && parsed.every((t) => typeof t === "string")
      ? parsed
      : [];
  } catch {
    return [];
  }
}

export function useSelectedTasks(): [string[], (tasks: string[]) => void] {
  const [searchParams, setSearchParams] = useSearchParams();

  const selectedTasks = useMemo(
    () => getTasksFromSearchParams(searchParams),
    [searchParams]
  );

  const setSelectedTasks = useCallback(
    (tasks: string[]) => {
      updateSearchParamsWithTasks(tasks, searchParams, setSearchParams);
    },
    [searchParams, setSearchParams]
  );

  return [selectedTasks, setSelectedTasks];
}

export function useFetchedTasks(
  data: WorkflowRelayQuery$data,
  visit: Visit,
  workflowName: string
): Task[] {
  const [fetchedTasks, setFetchedTasks] = useState<Task[]>([]);

  useEffect(() => {
    if (data.workflow.status && isWorkflowWithTasks(data.workflow.status)) {
      setFetchedTasks(
        data.workflow.status.tasks.map((task) => ({
          id: task.id,
          name: task.name,
          status: task.status as TaskStatus,
          depends: [...task.depends],
          artifacts: task.artifacts.map((artifact) => ({
            ...artifact,
            parentTask: task.name,
            key: `${task.name}-${artifact.name}`,
          })),
          workflow: workflowName,
          instrumentSession: visit,
          stepType: task.stepType,
        }))
      );
    }
  }, [data.workflow.status, visit, workflowName]);

  return fetchedTasks;
}
