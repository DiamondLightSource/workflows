import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Artifact, Task } from "workflows-lib";
import { isWorkflowWithTasks } from "../utils/coreUtils";
import { useFragment } from "react-relay";
import { WorkflowTasksFragment } from "../graphql/WorkflowTasksFragment";
import { WorkflowTasksFragment$key } from "../graphql/__generated__/WorkflowTasksFragment.graphql";

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
  fragmentRef: WorkflowTasksFragment$key | null,
): Task[] {
  const [fetchedTasks, setFetchedTasks] = useState<Task[]>([]);
  const data = useFragment(WorkflowTasksFragment, fragmentRef);

  useEffect(() => {
    if (data && data.status && isWorkflowWithTasks(data.status)) {
      setFetchedTasks(
        data.status.tasks.map((task: Task) => ({
          id: task.id,
          name: task.name,
          status: task.status,
          depends: [...(task.depends ?? [])],
          artifacts: task.artifacts.map((artifact: Artifact) => ({
            ...artifact,
            parentTask: task.name,
            parentTaskId: task.id,
            key: `${task.id}-${artifact.name}`,
          })),
          workflow: data.name,
          instrumentSession: data.visit,
          stepType: task.stepType,
        })),
      );
    }
  }, [data]);

  return fetchedTasks;
}
