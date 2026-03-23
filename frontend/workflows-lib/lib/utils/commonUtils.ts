import { Visit, regexToVisit } from "@diamondlightsource/sci-react-ui";
import { TemplateSource, ScienceGroup } from "../types";

const visitRegex = /^([a-z]{2})([1-9]\d*)-([1-9]\d*)/;
export const visitWithTemplateRegex = new RegExp(
  `${visitRegex.source}(?:-(.+))?$`,
);

export function visitTextToVisit(visitid?: string): Visit | null {
  if (visitid) {
    const parsedVisit = visitRegex.exec(visitid);
    if (parsedVisit != null) {
      return regexToVisit(parsedVisit);
    }
  }
  return null;
}

export function parseVisitAndTemplate(input: string): [Visit, string] | null {
  const match = visitWithTemplateRegex.exec(input);
  if (!match) return null;

  const visit = regexToVisit(match);
  const templateName = match[4];

  return [visit, templateName];
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
