import { Visit, regexToVisit, visitRegex } from "@diamondlightsource/sci-react-ui";

export const visitWithTemplateRegex = new RegExp(`${visitRegex.source}-(.+)$`);

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
