import { useState } from "react";
import type { workflowFragment$data } from "./graphql/__generated__/workflowFragment.graphql";

type WorkflowStatus = NonNullable<workflowFragment$data["status"]>;
type WorkflowStatusType = NonNullable<workflowFragment$data["status"]>;

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

export function workflowsAreEqual(
  a: workflowFragment$data | workflowFragment$data[],
  b: workflowFragment$data | workflowFragment$data[],
): boolean {
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    return a.every((wfA, i) => workflowsAreEqual(wfA, b[i]));
  }

  if (!Array.isArray(a) && !Array.isArray(b)) {
    const statusA = a.status;
    const statusB = b.status;

    if (!statusA || !statusB) return statusA === statusB;
    if (statusA.__typename !== statusB.__typename) return false;

    const hasTasksA = hasTasks(statusA);
    const hasTasksB = hasTasks(statusB);

    if (hasTasksA !== hasTasksB) return false;
    if (!hasTasksA || !hasTasksB) return true;

    const tasksA = statusA.tasks;
    const tasksB = statusB.tasks;

    if (tasksA.length !== tasksB.length) return false;

    for (let i = 0; i < tasksA.length; i++) {
      const taskA = tasksA[i];
      const taskB = tasksB[i];

      if (
        taskA.id !== taskB.id ||
        taskA.name !== taskB.name ||
        taskA.status !== taskB.status ||
        taskA.stepType !== taskB.stepType ||
        taskA.depends.length !== taskB.depends.length ||
        !taskA.depends.every((d, j) => d === taskB.depends[j]) ||
        taskA.artifacts.length !== taskB.artifacts.length ||
        !taskA.artifacts.every((a, j) => {
          const bArt = taskB.artifacts[j];
          return (
            a.name === bArt.name &&
            a.url === bArt.url &&
            a.mimeType === bArt.mimeType
          );
        })
      ) {
        return false;
      }
    }

    return true;
  }

  return false;
}

function partitionWorkflows(
  fetchedNames: string[],
  visibleNames: string[],
): [string[], string[]] {
  return fetchedNames.reduce<[string[], string[]]>(
    ([updated, added], n) => {
      if (visibleNames.includes(n)) {
        updated.push(n);
      } else {
        added.push(n);
      }
      return [updated, added];
    },
    [[], []],
  );
}

export function updateWorkflowsState(
  fetched: string[],
  visible: string[],
  currentNew: string[],
  setVisible: (w: string[]) => void,
  setNew: (w: string[]) => void,
) {
  const [updated, added] = partitionWorkflows(fetched, visible);

  const namesChanged =
    updated.length !== visible.length ||
    updated.some((name, i) => name !== visible[i]);
  if (namesChanged) {
    setVisible(updated);
  }

  const combined = [...new Set([...currentNew, ...added])];
  const newChanged =
    combined.length !== currentNew.length ||
    combined.some((name, i) => name !== currentNew[i]);

  if (newChanged) {
    setNew(combined);
  }
}
