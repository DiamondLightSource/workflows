import { useState } from "react";
import { Task } from "workflows-lib";
import { WorkflowStatusType } from "./types";
import { workflowFragment$data } from "./graphql/__generated__/workflowFragment.graphql";

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

export function workflowsAreEqual(
  a: workflowFragment$data | workflowFragment$data[],
  b: workflowFragment$data | workflowFragment$data[],
): boolean {
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    return a.every((wfA, i) => workflowsAreEqual(wfA, b[i]));
  }

  if (!Array.isArray(a) && !Array.isArray(b)) {
    if (a.status?.__typename !== b.status?.__typename) return false;

    const tasksA: Task[] = (a.status as { tasks?: Task[] }).tasks ?? [];
    const tasksB: Task[] = (b.status as { tasks?: Task[] }).tasks ?? [];

    if (tasksA.length !== tasksB.length) return false;

    return tasksA.every((taskA, j) => {
      const taskB = tasksB[j];
      return (
        taskA.status === taskB.status &&
        taskA.artifacts.length === taskB.artifacts.length
      );
    });
  }

  return false;
}
