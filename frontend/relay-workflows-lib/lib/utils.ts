import { useState } from "react";

import type { workflowRelayQuery$data } from "./graphql/__generated__/workflowRelayQuery.graphql";
import { workflowRelaySubscription$data } from "./graphql/__generated__/workflowRelaySubscription.graphql";
type WorkflowStatusType = NonNullable<
  workflowRelayQuery$data["workflow"]["status"]
>;
type WorkflowStatus = NonNullable<
  workflowRelayQuery$data["workflow"]["status"]
>;

export const isWorkflowWithTasks = (status: WorkflowStatusType) => {
  return (
    status.__typename === "WorkflowErroredStatus" ||
    status.__typename === "WorkflowFailedStatus" ||
    status.__typename === "WorkflowRunningStatus" ||
    status.__typename === "WorkflowSucceededStatus"
  );
};

export function useClientSidePagination<T>(
  items: readonly T[] | T[],
  perPage: number = 10,
) {
  const [pageNumber, setPageNumber] = useState(1);

  const totalPages = Math.ceil(items.length / perPage);
  const startIndex = (pageNumber - 1) * perPage;
  const endIndex = startIndex + perPage;
  const paginatedItems = items.slice(startIndex, endIndex);

  return {
    pageNumber,
    setPageNumber,
    totalPages,
    paginatedItems,
  };
}

function hasTasks(
  status: WorkflowStatus | null | undefined,
): status is Extract<WorkflowStatus, { tasks: readonly unknown[] }> {
  return !!status && "tasks" in status && Array.isArray(status.tasks);
}

export function getNormalisedResponse(
  response?: workflowRelaySubscription$data | null,
): workflowRelaySubscription$data | null | undefined {
  let normalised = response;
  if (hasTasks(response?.workflow.status)) {
    normalised = {
      ...response,
      workflow: {
        ...response.workflow,
        status: {
          ...response.workflow.status,
          tasks: [...response.workflow.status.tasks].sort((a, b) =>
            a.name.localeCompare(b.name),
          ),
        },
      },
    };
  }
  return normalised;
}

export function updateWorkflowsState(
  fetched: string[],
  visible: string[],
  currentNew: string[],
  setNew: (w: string[]) => void,
) {
  const added = fetched.filter((name) => !visible.includes(name));

  const combined = [...new Set([...currentNew, ...added])];
  const newChanged =
    combined.length !== currentNew.length ||
    combined.some((name, i) => name !== currentNew[i]);

  if (newChanged) {
    setNew(combined);
  }
}
