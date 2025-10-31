import { useEffect, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Visit, visitToText } from "@diamondlightsource/sci-react-ui";
import { visitTextToVisit } from "workflows-lib/lib/utils/commonUtils";
import { workflowRelayQuery$data } from "../graphql/__generated__/workflowRelayQuery.graphql";
import { workflowRelaySubscription$data } from "../graphql/__generated__/workflowRelaySubscription.graphql";
import { LiveWorkflowRelaySubscription$data } from "../subscription-components/__generated__/LiveWorkflowRelaySubscription.graphql";
import { LiveSingleWorkflowViewSubscription$data } from "../views/__generated__/LiveSingleWorkflowViewSubscription.graphql";
import { Task } from "workflows-lib";

export const useVisitInput = (initialVisitId?: string | null) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [visit, setVisit] = useState<Visit | null>(
    visitTextToVisit(initialVisitId ?? undefined),
  );

  const handleVisitSubmit = (visit: Visit | null) => {
    if (visit) {
      const route = location.pathname.split("/")[1]; // Extract the first segment of the path
      const visitid = visitToText(visit);
      localStorage.setItem("instrumentSessionID", visitid);
      Promise.resolve(navigate(`/${route}/${visitid}/`))
        .then(() => {
          setVisit(visit);
        })
        .catch((error: unknown) => {
          console.error("Navigation error:", error);
        });
    }
  };

  return { visit, handleVisitSubmit };
};

export function ScrollRestorer() {
  const scrollRef = useRef<number>(0);

  useEffect(() => {
    return () => {
      scrollRef.current = window.scrollY;
    };
  }, []);

  useEffect(() => {
    window.scrollTo(0, scrollRef.current);
  }, []);

  return null;
}

type WorkflowStatusWithTasks =
  | {
      __typename: "WorkflowRunningStatus";
      tasks: Task[];
    }
  | {
      __typename: "WorkflowSucceededStatus";
      tasks: Task[];
    }
  | {
      __typename: "WorkflowFailedStatus";
      tasks: Task[];
    }
  | {
      __typename: "WorkflowErroredStatus";
      tasks: Task[];
    };

export function isWorkflowWithTasks(status: {
  __typename: string;
}): status is WorkflowStatusWithTasks {
  return (
    status.__typename === "WorkflowRunningStatus" ||
    status.__typename === "WorkflowSucceededStatus" ||
    status.__typename === "WorkflowFailedStatus" ||
    status.__typename === "WorkflowErroredStatus"
  );
}

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

export const finishedStatuses = new Set([
  "WorkflowErroredStatus",
  "WorkflowFailedStatus",
  "WorkflowSucceededStatus",
]);

export function isFinished(
  data:
    | workflowRelayQuery$data
    | workflowRelaySubscription$data
    | LiveSingleWorkflowViewSubscription$data
    | LiveWorkflowRelaySubscription$data,
) {
  return (
    data.workflow.status?.__typename &&
    finishedStatuses.has(data.workflow.status.__typename)
  );
}
