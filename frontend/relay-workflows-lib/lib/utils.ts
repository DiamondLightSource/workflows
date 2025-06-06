import { useState } from "react";
import { WorkflowStatusType } from "./types";

export const isWorkflowWithTasks = (status: WorkflowStatusType) => {
    return (
      status.__typename === "WorkflowErroredStatus" ||
      status.__typename === "WorkflowFailedStatus" ||
      status.__typename === "WorkflowRunningStatus" ||
      status.__typename === "WorkflowSucceededStatus"
    );
  };

export  function useClientSidePagination<T>(items: readonly T[] | T[], perPage: number = 10) {
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
