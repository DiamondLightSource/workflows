import { Visit, regexToVisit } from "@diamondlightsource/sci-react-ui";
import { TemplateSource, ScienceGroup, Workflow } from "../types";

const visitRegex = /^([a-z]{2})([1-9]\d*)-([1-9]\d*)/;

export function visitTextToVisit(visitid?: string): Visit | null {
  if (visitid) {
    const parsedVisit = visitRegex.exec(visitid);
    if (parsedVisit != null) {
      return regexToVisit(parsedVisit);
    }
  }
  return null;
}

export function splitWorkflowId(
  id?: string,
): { visit: Visit; workflowName?: string; uid?: string } | undefined {
  if (!id) {
    return;
  }

  const idParts = id.split(":");
  const visit = visitTextToVisit(idParts[0]);

  if (!visit) {
    console.error("Invalid visit format in workflow ID");
    return;
  }
  if (idParts.length != 3) {
    return { visit: visit };
  }
  return { visit: visit, workflowName: idParts[1], uid: idParts[2] };
}

export function templateSourceToLink(
  source: TemplateSource | string | null | undefined,
) {
  if (!source) {
    return null;
  }

  if (typeof source === "string") return source;
  let repo = source.repositoryUrl;
  let path = source.path;
  let rev = source.targetRevision;
  if (!repo || !path || !rev) {
    return null;
  }

  // Assumes a GitHub repo - this may need updating in future
  if (rev === "HEAD") {
    rev = "main";
  }

  if (repo.endsWith("/")) {
    repo = repo.slice(0, -1);
  }
  if (path.startsWith("/")) {
    path = path.slice(1);
  }
  return repo + "/tree/" + rev + "/" + path;
}

export function formatErrorMessage(errorMessage: string | undefined) {
  const defaultMessage = "Something went wrong with the GraphQL query.";
  const authWorkflowsMessage = "You are not authorised to access this visit.";
  const authTemplateMessage = "You are not authorised to access the templates.";

  if (errorMessage?.includes("Unauthorized")) {
    if (errorMessage.includes("Template")) return authTemplateMessage;
    if (errorMessage.includes("Workflow")) return authWorkflowsMessage;
  }
  return defaultMessage;
}

export function convertStringToScienceGroup(
  input: string,
): ScienceGroup | undefined {
  return Object.values(ScienceGroup).includes(input as ScienceGroup)
    ? (input as ScienceGroup)
    : undefined;
}

/**
 * Format the submission date.
 *
 * Example: 29 Apr 2026
 */
export const formatSubmittedDate = (
  submittedTime?: Workflow["submittedTime"],
): string | null => {
  if (!submittedTime) {
    return null;
  }

  const date = new Date(submittedTime);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return new Intl.DateTimeFormat(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
};

/**
 * Format the submission time.
 *
 * Example: 17:16
 */
export const formatSubmittedTime = (
  submittedTime?: Workflow["submittedTime"],
): string | null => {
  if (!submittedTime) {
    return null;
  }

  const date = new Date(submittedTime);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return new Intl.DateTimeFormat(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

/**
 * Full date/time used in the tooltip.
 *
 * Example: 29 April 2026, 17:16
 */
export const formatFullDateTime = (
  submittedTime?: Workflow["submittedTime"],
): string | null => {
  if (!submittedTime) {
    return null;
  }

  const date = new Date(submittedTime);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return new Intl.DateTimeFormat(undefined, {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};
