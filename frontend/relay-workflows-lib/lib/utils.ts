import { useState } from "react";
import type { workflowRelayQuery$data } from "./graphql/__generated__/workflowRelayQuery.graphql";
import { workflowRelaySubscription$data } from "./graphql/__generated__/workflowRelaySubscription.graphql";
type WorkflowStatusType = NonNullable<
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

const finishedStatuses = new Set([
  "WorkflowErroredStatus",
  "WorkflowFailedStatus",
  "WorkflowSucceededStatus",
]);

export function isFinished(
  data: workflowRelayQuery$data | workflowRelaySubscription$data,
) {
  return (
    data.workflow.status?.__typename &&
    finishedStatuses.has(data.workflow.status.__typename)
  );
}
