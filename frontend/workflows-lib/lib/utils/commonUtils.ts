import { Visit, regexToVisit } from "@diamondlightsource/sci-react-ui";

const visitRegex = /^([a-z]{2})([1-9]\d*)-([1-9]\d*)/;
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
