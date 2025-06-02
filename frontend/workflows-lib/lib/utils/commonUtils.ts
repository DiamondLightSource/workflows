import { Visit } from "../types";

export const visitRegex = /^([a-z]{2})([1-9]\d*)-([1-9]\d*)/;
export const visitWithTemplateRegex = new RegExp(`${visitRegex.source}-(.+)$`);

export const visitToText = (visit?: Visit): string => {
  return visit
    ? `${visit.proposalCode}${visit.proposalNumber.toFixed(
        0
      )}-${visit.number.toFixed(0)}`
    : "";
};

export const regexToVisit = (parsedVisit: RegExpExecArray): Visit => {
  return {
    proposalCode: parsedVisit[1],
    proposalNumber: Number(parsedVisit[2]),
    number: Number(parsedVisit[3]),
  };
};

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
