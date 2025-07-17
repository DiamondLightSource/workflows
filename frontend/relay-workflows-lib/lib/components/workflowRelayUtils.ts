import { useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";

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
