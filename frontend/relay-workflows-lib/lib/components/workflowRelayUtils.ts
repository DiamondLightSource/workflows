import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Task, TaskStatus } from "workflows-lib";
import { isWorkflowWithTasks } from "../utils";
import { workflowRelaySubscription$data } from "../graphql/__generated__/workflowRelaySubscription.graphql";

export function updateSearchParamsWithTaskIds(
  updatedTaskIds: string[],
  searchParams: URLSearchParams,
  setSearchParams: (params: URLSearchParams) => void,
) {
  const params = new URLSearchParams(searchParams);
  if (updatedTaskIds.length > 0) {
    params.set("tasks", JSON.stringify(updatedTaskIds));
  } else {
    params.delete("tasks");
  }
  setSearchParams(params);
}

export function getTasksIdsFromSearchParams(searchParams: URLSearchParams) {
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

export function useSelectedTaskIds(): [string[], (tasks: string[]) => void] {
  const [searchParams, setSearchParams] = useSearchParams();

  const selectedTaskIds = useMemo(
    () => getTasksIdsFromSearchParams(searchParams),
    [searchParams],
  );

  const setSelectedTaskIds = useCallback(
    (taskIds: string[]) => {
      updateSearchParamsWithTaskIds(taskIds, searchParams, setSearchParams);
    },
    [searchParams, setSearchParams],
  );

  return [selectedTaskIds, setSelectedTaskIds];
}

export function useFetchedTasks(
  data: workflowRelaySubscription$data | null,
): Task[] {
  const [fetchedTasks, setFetchedTasks] = useState<Task[]>([]);

  useEffect(() => {
    if (
      data &&
      data.workflow.status &&
      isWorkflowWithTasks(data.workflow.status)
    ) {
      setFetchedTasks(
        data.workflow.status.tasks.map((task) => ({
          id: task.id,
          name: task.name,
          status: task.status as TaskStatus,
          depends: [...task.depends],
          artifacts: task.artifacts.map((artifact) => ({
            ...artifact,
            parentTask: task.name,
            parentTaskId: task.id,
            key: `${task.id}-${artifact.name}`,
          })),
          workflow: data.workflow.name,
          instrumentSession: data.workflow.visit,
          stepType: task.stepType,
        })),
      );
    }
  }, [data]);

  return fetchedTasks;
}
