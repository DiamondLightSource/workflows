import { useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { Artifact, Task } from "workflows-lib";
import { isWorkflowWithTasks } from "../utils/coreUtils";
import { useFragment } from "react-relay";
import { WorkflowTasksFragment } from "../graphql/WorkflowTasksFragment";
import {
  WorkflowTasksFragment$data,
  WorkflowTasksFragment$key,
} from "../graphql/__generated__/WorkflowTasksFragment.graphql";
import { JSONObject } from "workflows-lib";
import { SubmissionFormParametersFragment$data } from "../components/__generated__/SubmissionFormParametersFragment.graphql";
import { JsonSchema } from "@jsonforms/core";

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

function setFetchedTasks(data: WorkflowTasksFragment$data): Task[] {
  if (data.status && isWorkflowWithTasks(data.status)) {
    return data.status.tasks.map((task: Task) => ({
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
      workflow: data.id,
      instrumentSession: data.visit,
      stepType: task.stepType,
    }));
  }
  return [];
}

export function useFetchedTasks(
  fragmentRef: WorkflowTasksFragment$key | null,
): Task[] {
  const data = useFragment(WorkflowTasksFragment, fragmentRef);

  const fetchedTasks: Task[] = useMemo(() => {
    if (data == null) {
      return [];
    }
    return setFetchedTasks(data);
  }, [data]);

  return fetchedTasks;
}

export function mergeParameters(
  reusedParameterData: SubmissionFormParametersFragment$data | null | undefined,
  searchParams: URLSearchParams,
  parametersSchema?: JsonSchema,
) {
  const searchParameterData: JSONObject = {};
  if (!parametersSchema) {
    return {
      ...reusedParameterData?.parameters,
      ...Object.fromEntries(searchParams.entries()),
    } as JSONObject;
  }

  for (const [key, value] of searchParams.entries()) {
    const propertySchema = parametersSchema.properties?.[key];

    // Ignore URL parameters that do not exist in the template schema.
    if (!propertySchema || typeof propertySchema === "boolean") {
      continue;
    }

    if (propertySchema.type === "array" || propertySchema.type === "object") {
      try {
        const parsedValue: unknown = JSON.parse(value);

        const hasExpectedType =
          (propertySchema.type === "array" && Array.isArray(parsedValue)) ||
          (propertySchema.type === "object" &&
            parsedValue !== null &&
            typeof parsedValue === "object" &&
            !Array.isArray(parsedValue));

        if (!hasExpectedType) {
          console.warn(
            `Ignoring URL parameter "${key}": expected ${propertySchema.type}.`,
          );
          continue;
        }

        // Argo workflow parameters are passed as strings.
        searchParameterData[key] = JSON.stringify(parsedValue);
      } catch {
        if (key === "multiEdge") {
          searchParameterData[key] = [
            ...value
              .split(",")
              .filter(Boolean)
              .map((edge) => {
                const [edgeElement, edgeTransition] = edge.split("-");

                return {
                  edgeElement,
                  edgeTransition,
                };
              }),
          ];

          continue;
        }

        if (key === "multiScan") {
          searchParameterData[key] = [
            ...value
              .split(",")
              .filter(Boolean)
              .map((scan) => {
                const [start, end] = scan.split("-");

                return {
                  multiScan: {
                    start: Number(start),
                    end: Number(end),
                    excluded: [],
                  },
                };
              }),
          ];

          continue;
        }

        console.warn(
          `Ignoring URL parameter "${key}": value is not valid JSON.`,
        );
      }

      continue;
    }

    // Preserve existing behaviour for flat parameters.
    searchParameterData[key] = value;
  }

  return {
    ...reusedParameterData?.parameters,
    ...searchParameterData,
  } as JSONObject;
}
